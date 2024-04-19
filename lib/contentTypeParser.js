'use strict'

const { AsyncResource } = require('node:async_hooks')
const { FifoMap: Fifo } = require('toad-cache')
const { safeParse: safeParseContentType, defaultContentType } = require('fast-content-type-parse')
const secureJson = require('secure-json-parse')
const {
  kDefaultJsonParse,
  kContentTypeParser,
  kBodyLimit,
  kRequestPayloadStream,
  kState,
  kTestInternals,
  kReplyIsError,
  kRouteContext
} = require('./symbols')

const {
  FST_ERR_CTP_INVALID_TYPE,
  FST_ERR_CTP_EMPTY_TYPE,
  FST_ERR_CTP_ALREADY_PRESENT,
  FST_ERR_CTP_INVALID_HANDLER,
  FST_ERR_CTP_INVALID_PARSE_TYPE,
  FST_ERR_CTP_BODY_TOO_LARGE,
  FST_ERR_CTP_INVALID_MEDIA_TYPE,
  FST_ERR_CTP_INVALID_CONTENT_LENGTH,
  FST_ERR_CTP_EMPTY_JSON_BODY,
  FST_ERR_CTP_INSTANCE_ALREADY_STARTED
} = require('./errors')

function ContentTypeParser (bodyLimit, onProtoPoisoning, onConstructorPoisoning) {
  this[kDefaultJsonParse] = getDefaultJsonParser(onProtoPoisoning, onConstructorPoisoning)
  // using a map instead of a plain object to avoid prototype hijack attacks
  this.customParsers = new Map()
  this.customParsers.set('application/json', new Parser(true, false, bodyLimit, this[kDefaultJsonParse]))
  this.customParsers.set('text/plain', new Parser(true, false, bodyLimit, defaultPlainTextParser))
  this.parserList = [new ParserListItem('application/json'), new ParserListItem('text/plain')]
  this.parserRegExpList = []
  this.cache = new Fifo(100)
}

ContentTypeParser.prototype.add = function (contentType, opts, parserFn) {
  const contentTypeIsString = typeof contentType === 'string'

  if (!contentTypeIsString && !(contentType instanceof RegExp)) throw new FST_ERR_CTP_INVALID_TYPE()
  if (contentTypeIsString && contentType.length === 0) throw new FST_ERR_CTP_EMPTY_TYPE()
  if (typeof parserFn !== 'function') throw new FST_ERR_CTP_INVALID_HANDLER()

  if (this.existingParser(contentType)) {
    throw new FST_ERR_CTP_ALREADY_PRESENT(contentType)
  }

  if (opts.parseAs !== undefined) {
    if (opts.parseAs !== 'string' && opts.parseAs !== 'buffer') {
      throw new FST_ERR_CTP_INVALID_PARSE_TYPE(opts.parseAs)
    }
  }

  const parser = new Parser(
    opts.parseAs === 'string',
    opts.parseAs === 'buffer',
    opts.bodyLimit,
    parserFn
  )

  if (contentTypeIsString && contentType === '*') {
    this.customParsers.set('', parser)
  } else {
    if (contentTypeIsString) {
      this.parserList.unshift(new ParserListItem(contentType))
    } else {
      contentType.isEssence = contentType.source.indexOf(';') === -1
      this.parserRegExpList.unshift(contentType)
    }
    this.customParsers.set(contentType.toString(), parser)
  }
}

ContentTypeParser.prototype.hasParser = function (contentType) {
  return this.customParsers.has(typeof contentType === 'string' ? contentType : contentType.toString())
}

ContentTypeParser.prototype.existingParser = function (contentType) {
  if (contentType === 'application/json' && this.customParsers.has(contentType)) {
    return this.customParsers.get(contentType).fn !== this[kDefaultJsonParse]
  }
  if (contentType === 'text/plain' && this.customParsers.has(contentType)) {
    return this.customParsers.get(contentType).fn !== defaultPlainTextParser
  }

  return this.hasParser(contentType)
}

ContentTypeParser.prototype.getParser = function (contentType) {
  if (this.hasParser(contentType)) {
    return this.customParsers.get(contentType)
  }

  const parser = this.cache.get(contentType)
  if (parser !== undefined) return parser

  const parsed = safeParseContentType(contentType)

  // dummyContentType always the same object
  // we can use === for the comparison and return early
  if (parsed === defaultContentType) {
    return this.customParsers.get('')
  }

  // eslint-disable-next-line no-var
  for (var i = 0; i !== this.parserList.length; ++i) {
    const parserListItem = this.parserList[i]
    if (compareContentType(parsed, parserListItem)) {
      const parser = this.customParsers.get(parserListItem.name)
      // we set request content-type in cache to reduce parsing of MIME type
      this.cache.set(contentType, parser)
      return parser
    }
  }

  // eslint-disable-next-line no-var
  for (var j = 0; j !== this.parserRegExpList.length; ++j) {
    const parserRegExp = this.parserRegExpList[j]
    if (compareRegExpContentType(contentType, parsed.type, parserRegExp)) {
      const parser = this.customParsers.get(parserRegExp.toString())
      // we set request content-type in cache to reduce parsing of MIME type
      this.cache.set(contentType, parser)
      return parser
    }
  }

  return this.customParsers.get('')
}

ContentTypeParser.prototype.removeAll = function () {
  this.customParsers = new Map()
  this.parserRegExpList = []
  this.parserList = []
  this.cache = new Fifo(100)
}

ContentTypeParser.prototype.remove = function (contentType) {
  if (!(typeof contentType === 'string' || contentType instanceof RegExp)) throw new FST_ERR_CTP_INVALID_TYPE()

  const removed = this.customParsers.delete(contentType.toString())

  const parsers = typeof contentType === 'string' ? this.parserList : this.parserRegExpList

  const idx = parsers.findIndex(ct => ct.toString() === contentType.toString())

  if (idx > -1) {
    parsers.splice(idx, 1)
  }

  return removed || idx > -1
}

ContentTypeParser.prototype.run = function (contentType, handler, request, reply) {
  const parser = this.getParser(contentType)

  if (parser === undefined) {
    if (request.is404) {
      handler(request, reply)
    } else {
      reply.send(new FST_ERR_CTP_INVALID_MEDIA_TYPE(contentType || undefined))
    }

    // Early return to avoid allocating an AsyncResource if it's not needed
    return
  }

  const resource = new AsyncResource('content-type-parser:run', request)

  if (parser.asString === true || parser.asBuffer === true) {
    rawBody(
      request,
      reply,
      reply[kRouteContext]._parserOptions,
      parser,
      done
    )
  } else {
    const result = parser.fn(request, request[kRequestPayloadStream], done)

    if (result && typeof result.then === 'function') {
      result.then(body => done(null, body), done)
    }
  }

  function done (error, body) {
    // We cannot use resource.bind() because it is broken in node v12 and v14
    resource.runInAsyncScope(() => {
      resource.emitDestroy()
      if (error) {
        reply[kReplyIsError] = true
        reply.send(error)
      } else {
        request.body = body
        handler(request, reply)
      }
    })
  }
}

function rawBody (request, reply, options, parser, done) {
  const asString = parser.asString
  const limit = options.limit === null ? parser.bodyLimit : options.limit
  const contentLength = request.headers['content-length'] === undefined
    ? NaN
    : Number(request.headers['content-length'])

  if (contentLength > limit) {
    // We must close the connection as the client is going
    // to send this data anyway
    reply.header('connection', 'close')
    reply.send(new FST_ERR_CTP_BODY_TOO_LARGE())
    return
  }

  let receivedLength = 0
  let body = asString === true ? '' : []

  const payload = request[kRequestPayloadStream] || request.raw

  if (asString === true) {
    payload.setEncoding('utf8')
  }

  payload.on('data', onData)
  payload.on('end', onEnd)
  payload.on('error', onEnd)
  payload.resume()

  function onData (chunk) {
    receivedLength += chunk.length
    const { receivedEncodedLength = 0 } = payload
    // The resulting body length must not exceed bodyLimit (see "zip bomb").
    // The case when encoded length is larger than received length is rather theoretical,
    // unless the stream returned by preParsing hook is broken and reports wrong value.
    if (receivedLength > limit || receivedEncodedLength > limit) {
      payload.removeListener('data', onData)
      payload.removeListener('end', onEnd)
      payload.removeListener('error', onEnd)
      reply.send(new FST_ERR_CTP_BODY_TOO_LARGE())
      return
    }

    if (asString === true) {
      body += chunk
    } else {
      body.push(chunk)
    }
  }

  function onEnd (err) {
    payload.removeListener('data', onData)
    payload.removeListener('end', onEnd)
    payload.removeListener('error', onEnd)

    if (err !== undefined) {
      if (!(typeof err.statusCode === 'number' && err.statusCode >= 400)) {
        err.statusCode = 400
      }
      reply[kReplyIsError] = true
      reply.code(err.statusCode).send(err)
      return
    }

    if (asString === true) {
      receivedLength = Buffer.byteLength(body)
    }

    if (!Number.isNaN(contentLength) && (payload.receivedEncodedLength || receivedLength) !== contentLength) {
      reply.header('connection', 'close')
      reply.send(new FST_ERR_CTP_INVALID_CONTENT_LENGTH())
      return
    }

    if (asString === false) {
      body = Buffer.concat(body)
    }

    const result = parser.fn(request, body, done)
    if (result && typeof result.then === 'function') {
      result.then(body => done(null, body), done)
    }
  }
}

function getDefaultJsonParser (onProtoPoisoning, onConstructorPoisoning) {
  return defaultJsonParser

  function defaultJsonParser (req, body, done) {
    if (body === '' || body == null || (Buffer.isBuffer(body) && body.length === 0)) {
      return done(new FST_ERR_CTP_EMPTY_JSON_BODY(), undefined)
    }
    let json
    try {
      json = secureJson.parse(body, { protoAction: onProtoPoisoning, constructorAction: onConstructorPoisoning })
    } catch (err) {
      err.statusCode = 400
      return done(err, undefined)
    }
    done(null, json)
  }
}

function defaultPlainTextParser (req, body, done) {
  done(null, body)
}

function Parser (asString, asBuffer, bodyLimit, fn) {
  this.asString = asString
  this.asBuffer = asBuffer
  this.bodyLimit = bodyLimit
  this.fn = fn
}

function buildContentTypeParser (c) {
  const contentTypeParser = new ContentTypeParser()
  contentTypeParser[kDefaultJsonParse] = c[kDefaultJsonParse]
  contentTypeParser.customParsers = new Map(c.customParsers.entries())
  contentTypeParser.parserList = c.parserList.slice()
  contentTypeParser.parserRegExpList = c.parserRegExpList.slice()
  return contentTypeParser
}

function addContentTypeParser (contentType, opts, parser) {
  if (this[kState].started) {
    throw new FST_ERR_CTP_INSTANCE_ALREADY_STARTED('addContentTypeParser')
  }

  if (typeof opts === 'function') {
    parser = opts
    opts = {}
  }

  if (!opts) opts = {}
  if (!opts.bodyLimit) opts.bodyLimit = this[kBodyLimit]

  if (Array.isArray(contentType)) {
    contentType.forEach((type) => this[kContentTypeParser].add(type, opts, parser))
  } else {
    this[kContentTypeParser].add(contentType, opts, parser)
  }

  return this
}

function hasContentTypeParser (contentType) {
  return this[kContentTypeParser].hasParser(contentType)
}

function removeContentTypeParser (contentType) {
  if (this[kState].started) {
    throw new FST_ERR_CTP_INSTANCE_ALREADY_STARTED('removeContentTypeParser')
  }

  if (Array.isArray(contentType)) {
    for (const type of contentType) {
      this[kContentTypeParser].remove(type)
    }
  } else {
    this[kContentTypeParser].remove(contentType)
  }
}

function removeAllContentTypeParsers () {
  if (this[kState].started) {
    throw new FST_ERR_CTP_INSTANCE_ALREADY_STARTED('removeAllContentTypeParsers')
  }

  this[kContentTypeParser].removeAll()
}

function compareContentType (contentType, parserListItem) {
  if (parserListItem.isEssence) {
    // we do essence check
    return contentType.type.indexOf(parserListItem) !== -1
  } else {
    // when the content-type includes parameters
    // we do a full-text search
    // reject essence content-type before checking parameters
    if (contentType.type.indexOf(parserListItem.type) === -1) return false
    for (const key of parserListItem.parameterKeys) {
      // reject when missing parameters
      if (!(key in contentType.parameters)) return false
      // reject when parameters do not match
      if (contentType.parameters[key] !== parserListItem.parameters[key]) return false
    }
    return true
  }
}

function compareRegExpContentType (contentType, essenceMIMEType, regexp) {
  if (regexp.isEssence) {
    // we do essence check
    return regexp.test(essenceMIMEType)
  } else {
    // when the content-type includes parameters
    // we do a full-text match
    return regexp.test(contentType)
  }
}

function ParserListItem (contentType) {
  this.name = contentType
  // we pre-calculate all the needed information
  // before content-type comparison
  const parsed = safeParseContentType(contentType)
  this.isEssence = contentType.indexOf(';') === -1
  // we should not allow empty string for parser list item
  // because it would become a match-all handler
  if (this.isEssence === false && parsed.type === '') {
    // handle semicolon or empty string
    const tmp = contentType.split(';', 1)[0]
    this.type = tmp === '' ? contentType : tmp
  } else {
    this.type = parsed.type
  }
  this.parameters = parsed.parameters
  this.parameterKeys = Object.keys(parsed.parameters)
}

// used in ContentTypeParser.remove
ParserListItem.prototype.toString = function () {
  return this.name
}

module.exports = ContentTypeParser
module.exports.helpers = {
  buildContentTypeParser,
  addContentTypeParser,
  hasContentTypeParser,
  removeContentTypeParser,
  removeAllContentTypeParsers
}
module.exports.defaultParsers = {
  getDefaultJsonParser,
  defaultTextParser: defaultPlainTextParser
}
module.exports[kTestInternals] = { rawBody }
