/* eslint-disable no-useless-return */
'use strict'

const validation = require('./validation')
const validateSchema = validation.validate
const { hookRunner, hookIterator } = require('./hooks')

function handleRequest (request, reply) {
  var method = request.raw.method
  var headers = request.headers

  if (method === 'GET' || method === 'HEAD') {
    handler(request, reply)
    return
  }

  var contentType = headers['content-type']

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (contentType === undefined) {
      if (
        headers['transfer-encoding'] === undefined &&
        (headers['content-length'] === '0' || headers['content-length'] === undefined)
      ) { // Request has no body to parse
        handler(request, reply)
      } else {
        reply.context.contentTypeParser.run('', handler, request, reply)
      }
    } else {
      reply.context.contentTypeParser.run(contentType, handler, request, reply)
    }
    return
  }

  if (method === 'OPTIONS' || method === 'DELETE') {
    if (
      contentType !== undefined &&
      (
        headers['transfer-encoding'] !== undefined ||
        headers['content-length'] !== undefined
      )
    ) {
      reply.context.contentTypeParser.run(contentType, handler, request, reply)
    } else {
      handler(request, reply)
    }
    return
  }

  // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
  reply.code(404).send(new Error('Not Found'))
}

function handler (request, reply) {
  var result = validateSchema(reply.context, request)
  if (result) {
    reply.code(400).send(result)
    return
  }

  // preHandler hook
  if (reply.context.preHandler !== null) {
    hookRunner(
      reply.context.preHandler,
      hookIterator,
      request,
      reply,
      preHandlerCallback
    )
  } else {
    preHandlerCallback(null, request, reply)
  }
}

function preHandlerCallback (err, request, reply) {
  if (reply.res.finished === true) return
  if (err) {
    reply.send(err)
    return
  }

  var result = reply.context.handler(request, reply)
  if (result && typeof result.then === 'function') {
    result
      .then(function (payload) {
        // this is for async functions that
        // are using reply.send directly
        if (payload !== undefined || (reply.res.statusCode === 204 && reply.sent === false)) {
          // we use a try-catch internally to avoid adding a catch to another
          // promise, increase promise perf by 10%
          try {
            reply.send(payload)
          } catch (err) {
            reply.sent = false
            reply._isError = true
            reply.send(err)
          }
        } else if (reply.sent === false) {
          reply.res.log.error(new Error(`Promise may not be fulfilled with 'undefined' when statusCode is not 204`))
        }
      }, function (err) {
        reply.sent = false
        reply._isError = true
        reply.send(err)
      })
  }
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { handler }
