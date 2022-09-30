'use strict'

const { AsyncResource } = require('async_hooks')
const lru = require('tiny-lru').lru

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
  FST_ERR_CTP_EMPTY_JSON_BODY
} = require('./errors')

function ContentTypeParser (bodyLimit, onProtoPoisoning, onConstructorPoisoning) {
  this[kDefaultJsonParse] = getDefaultJsonParser(onProtoPoisoning, onConstructorPoisoning)
  this.customParsers = {}
  this.customParsers['application/json'] = new Parser(true, false, bodyLimit, this[kDefaultJsonParse])
  this.customParsers['text/plain'] = new Parser(true, false, bodyLimit, defaultPlainTextParser)
  this.parserList = ['application/json', 'text/plain']
  this.parserRegExpList = []
  this.cache = lru(100)
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
    this.customParsers[''] = parser
  } else {
    if (contentTypeIsString) {
      this.parserList.unshift(contentType)
    } else {
      this.parserRegExpList.unshift(contentType)
    }
    this.customParsers[contentType] = parser
  }
}

ContentTypeParser.prototype.hasParser = function (contentType) {
  return contentType in this.customParsers
}

ContentTypeParser.prototype.existingParser = function (contentType) {
  if (contentType === 'application/json') {
    return this.customParsers['application/json'] && this.customParsers['application/json'].fn !== this[kDefaultJsonParse]
  }
  if (contentType === 'text/plain') {
    return this.customParsers['text/plain'] && this.customParsers['text/plain'].fn !== defaultPlainTextParser
  }

  return contentType in this.customParsers
}

ContentTypeParser.prototype.getParser = function (contentType) {
  if (contentType in this.customParsers) {
    return this.customParsers[contentType]
  }

  if (this.cache.has(contentType)) {
    return this.cache.get(contentType)
  }

  // eslint-disable-next-line no-var
  for (var i = 0; i !== this.parserList.length; ++i) {
    const parserName = this.parserList[i]
    if (contentType.indexOf(parserName) !== -1) {
      const parser = this.customParsers[parserName]
      this.cache.set(contentType, parser)
      return parser
    }
  }

  // eslint-disable-next-line no-var
  for (var j = 0; j !== this.parserRegExpList.length; ++j) {
    const parserRegExp = this.parserRegExpList[j]
    if (parserRegExp.test(contentType)) {
      const parser = this.customParsers[parserRegExp]
      this.cache.set(contentType, parser)
      return parser
    }
  }

  return this.customParsers['']
}

ContentTypeParser.prototype.removeAll = function () {
  this.customParsers = {}
  this.parserRegExpList = []
  this.parserList = []
  this.cache = lru(100)
}

ContentTypeParser.prototype.remove = function (contentType) {
  if (!(typeof contentType === 'string' || contentType instanceof RegExp)) throw new FST_ERR_CTP_INVALID_TYPE()

  delete this.customParsers[contentType]

  const parsers = typeof contentType === 'string' ? this.parserList : this.parserRegExpList

  const idx = parsers.findIndex(ct => ct.toString() === contentType.toString())

  if (idx > -1) {
    parsers.splice(idx, 1)
  }
}

ContentTypeParser.prototype.run = function (contentType, handler, request, reply) {
  const parser = this.getParser(contentType)
  const resource = new AsyncResource('content-type-parser:run', request)

  if (parser === undefined) {
    if (request.is404) {
      handler(request, reply)
    } else {
      reply.send(new FST_ERR_CTP_INVALID_MEDIA_TYPE(contentType || undefined))
    }
  } else if (parser.asString === true || parser.asBuffer === true) {
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

    if ((payload.receivedEncodedLength || receivedLength) > limit) {
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
      err.statusCode = 400
      reply[kReplyIsError] = true
      reply.code(err.statusCode).send(err)
      return
    }

    if (asString === true) {
      receivedLength = Buffer.byteLength(body)
    }

    if (!Number.isNaN(contentLength) && (payload.receivedEncodedLength || receivedLength) !== contentLength) {
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
    if (body === '' || body == null) {
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
  Object.assign(contentTypeParser.customParsers, c.customParsers)
  contentTypeParser.parserList = c.parserList.slice()
  return contentTypeParser
}

function addContentTypeParser (contentType, opts, parser) {
  if (this[kState].started) {
    throw new Error('Cannot call "addContentTypeParser" when fastify instance is already started!')
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
    throw new Error('Cannot call "removeContentTypeParser" when fastify instance is already started!')
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
    throw new Error('Cannot call "removeAllContentTypeParsers" when fastify instance is already started!')
  }

  this[kContentTypeParser].removeAll()
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
