/* eslint-disable no-useless-return */
'use strict'

const lru = require('tiny-lru')

function ContentTypeParser () {
  this.customParsers = {}
  this.customParsers['application/json'] = defaultJsonParser
  this.parserList = ['application/json']
  this.cache = lru(100)
}

ContentTypeParser.prototype.add = function (contentType, opts, parser) {
  if (typeof contentType !== 'string') throw new Error('The content type should be a string')
  if (contentType.length === 0) throw new Error('The content type cannot be an empty string')
  if (typeof parser !== 'function') throw new Error('The content type handler should be a function')

  if (this.hasParser(contentType)) {
    throw new Error(`Content type parser '${contentType}' already present.`)
  }

  parser.asString = opts.asString === true
  parser.asBuffer = opts.asBuffer === true

  if (contentType === '*') {
    this.parserList.push('')
    this.customParsers[''] = parser
  } else {
    if (contentType !== 'application/json') {
      this.parserList.unshift(contentType)
    }
    this.customParsers[contentType] = parser
  }
}

ContentTypeParser.prototype.hasParser = function (contentType) {
  if (contentType === 'application/json') {
    return this.customParsers['application/json'] !== defaultJsonParser
  }
  return contentType in this.customParsers
}

ContentTypeParser.prototype.fastHasHeader = function (contentType) {
  for (var i = 0; i < this.parserList.length; i++) {
    if (contentType.indexOf(this.parserList[i]) > -1) return true
  }
  return false
}

ContentTypeParser.prototype.getParser = function (contentType) {
  for (var i = 0; i < this.parserList.length; i++) {
    if (contentType.indexOf(this.parserList[i]) > -1) {
      var parser = this.customParsers[this.parserList[i]]
      this.cache.set(contentType, parser)
      return parser
    }
  }

  return this.customParsers['']
}

ContentTypeParser.prototype.run = function (contentType, handler, request, reply) {
  var parser = this.cache.get[contentType] || this.getParser(contentType)
  if (parser === undefined) {
    reply.code(415).send(new Error('Unsupported Media Type: ' + contentType))
  } else {
    if (parser.asString === true || parser.asBuffer === true) {
      rawBody(
        request,
        reply,
        reply.context._parserOptions,
        parser,
        done
      )
    } else {
      var result = parser(request.raw, done)
      if (result && typeof result.then === 'function') {
        result.then(body => done(null, body), done)
      }
    }
  }

  function done (error, body) {
    if (error) {
      reply.send(error)
    } else {
      request.body = body
      handler(reply)
    }
  }
}

function rawBody (request, reply, options, parser, done) {
  var asString = parser.asString
  var limit = options.limit
  var contentLength = request.headers['content-length'] === undefined
    ? NaN
    : Number.parseInt(request.headers['content-length'], 10)

  if (contentLength > limit) {
    reply.code(413).send(new Error('Request body is too large'))
    return
  }

  var receivedLength = 0
  var body = asString === true ? '' : []
  var req = request.raw

  req.on('data', onData)
  req.on('end', onEnd)
  req.on('error', onEnd)

  function onData (chunk) {
    receivedLength += chunk.length

    if (receivedLength > limit) {
      req.removeListener('data', onData)
      req.removeListener('end', onEnd)
      req.removeListener('error', onEnd)
      reply.code(413).send(new Error('Request body is too large'))
      return
    }

    if (asString === true) {
      body += chunk.toString()
    } else {
      body.push(chunk)
    }
  }

  function onEnd (err) {
    req.removeListener('data', onData)
    req.removeListener('end', onEnd)
    req.removeListener('error', onEnd)

    if (err !== undefined) {
      reply.code(400).send(err)
      return
    }

    if (!Number.isNaN(contentLength) && receivedLength !== contentLength) {
      reply.code(400).send(new Error('Request body size did not match Content-Length'))
      return
    }

    if (receivedLength === 0) {
      reply.code(400).send(new Error('Unexpected end of body input'))
      return
    }

    if (asString === false) {
      body = Buffer.concat(body)
    }

    var result = parser(request, reply, body, done)
    if (result && typeof result.then === 'function') {
      result.then(body => done(null, body), done)
    }
  }
}

function defaultJsonParser (request, reply, body, done) {
  try {
    var json = JSON.parse(body)
  } catch (err) {
    err.statusCode = 400
    return done(err, undefined)
  }
  done(null, json)
}
defaultJsonParser.asString = true

function buildContentTypeParser (c) {
  const contentTypeParser = new ContentTypeParser()
  Object.assign(contentTypeParser.customParsers, c.customParsers)
  contentTypeParser.parserList = c.parserList.slice()
  return contentTypeParser
}

module.exports = ContentTypeParser
module.exports.buildContentTypeParser = buildContentTypeParser
