/* eslint-disable no-useless-return */
'use strict'

const fastJsonStringify = require('fast-json-stringify')
const urlUtil = require('url')
const validation = require('./validation')
const validateSchema = validation.validate

const schemas = require('./schemas.json')
const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

function handleRequest (req, res, params, context) {
  var method = req.method
  var request = new context.Request(params, req, urlUtil.parse(req.url, true).query, req.headers, req.log)
  var reply = new context.Reply(res, context, request)

  if (method === 'GET' || method === 'HEAD') {
    return handler(reply)
  }

  var contentType = req.headers['content-type']

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // application/json content type
    if (contentType && contentType.indexOf('application/json') > -1) {
      return jsonBody(request, reply, context._jsonParserOptions)
    }

    // custom parser for a given content type
    if (context.contentTypeParser.fastHasHeader(contentType)) {
      return context.contentTypeParser.run(contentType, handler, request, reply)
    }

    reply.code(415).send(new Error('Unsupported Media Type: ' + contentType))
    return
  }

  if (method === 'OPTIONS' || method === 'DELETE') {
    if (!contentType) {
      return handler(reply)
    }

    // application/json content type
    if (contentType.indexOf('application/json') > -1) {
      return jsonBody(request, reply, context._jsonParserOptions)
    }
    // custom parser for a given content type
    if (context.contentTypeParser.fastHasHeader(contentType)) {
      return context.contentTypeParser.run(contentType, handler, request, reply)
    }

    reply.code(415).send(new Error('Unsupported Media Type: ' + contentType))
    return
  }

  reply.code(405).send(new Error('Method Not Allowed: ' + method))
  return
}

function jsonBody (request, reply, options) {
  const limit = options.limit
  const contentLength = request.headers['content-length'] === undefined
    ? NaN
    : Number.parseInt(request.headers['content-length'], 10)

  if (contentLength > limit) {
    reply.code(413).send(new Error('Request body is too large'))
    return
  }

  var receivedLength = 0
  var body = ''
  var req = request.req

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

    body += chunk.toString()
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

    if (receivedLength === 0) { // Body is invalid JSON
      reply.code(422).send(new Error('Unexpected end of JSON input'))
      return
    }

    try {
      request.body = JSON.parse(body)
    } catch (err) {
      reply.code(422).send(err)
      return
    }
    handler(reply)
  }
}

function handler (reply) {
  var valid = validateSchema(reply.context, reply.request)
  if (valid !== true) {
    reply.code(400).send(wrapValidationError(valid))
    return
  }

  // preHandler hook
  if (reply.context.preHandler !== null) {
    reply.context.preHandler(
      hookIterator,
      reply,
      preHandlerCallback
    )
  } else {
    preHandlerCallback(null, reply)
  }
}

function hookIterator (fn, reply, next) {
  return fn(reply.request, reply, next)
}

function preHandlerCallback (err, reply) {
  if (err) {
    reply.send(err)
    return
  }

  var result = reply.context.handler(reply.request, reply)
  if (result && typeof result.then === 'function') {
    result.then((payload) => {
      // this is for async functions that
      // are using reply.send directly
      if (payload !== undefined || (reply.res.statusCode === 204 && !reply.sent)) {
        reply.send(payload)
      }
    }).catch((err) => {
      reply._isError = true
      reply.send(err)
    })
  }
}

function wrapValidationError (valid) {
  if (valid instanceof Error) {
    return valid
  }
  var error = new Error(inputSchemaError(valid))
  error.validation = valid
  return error
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { jsonBody, handler }
