/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const validation = require('./validation')
const validateSchema = validation.validate
const runHooks = require('./hookRunner').hookRunner

function handleRequest (req, res, params, context) {
  var method = req.method
  var headers = req.headers
  var Request = context.Request
  var Reply = context.Reply
  var request = new Request(params, req, urlUtil.parse(req.url, true).query, headers, req.log)
  var reply = new Reply(res, context, request)

  if (method === 'GET' || method === 'HEAD') {
    handler(reply)
    return
  }

  var contentType = headers['content-type']

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    if (contentType === undefined) {
      if (
        headers['transfer-encoding'] === undefined &&
        (headers['content-length'] === '0' || headers['content-length'] === undefined)
      ) { // Request has no body to parse
        handler(reply)
      } else {
        context.contentTypeParser.run('', handler, request, reply)
      }
    } else {
      context.contentTypeParser.run(contentType, handler, request, reply)
    }
    return
  }

  if (method === 'OPTIONS' || method === 'DELETE') {
    if (contentType === undefined) {
      handler(reply)
    } else {
      context.contentTypeParser.run(contentType, handler, request, reply)
    }
    return
  }

  // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
  reply.code(404).send(new Error('Not Found'))
}

function handler (reply) {
  var result = validateSchema(reply.context, reply.request)
  if (result) {
    reply.code(400).send(result)
    return
  }

  // preHandler hook
  if (reply.context.preHandler !== null) {
    runHooks(
      reply.context.preHandler,
      hookIterator,
      reply,
      preHandlerCallback
    )
  } else {
    preHandlerCallback(null, reply)
  }
}

function hookIterator (fn, reply, next) {
  if (reply.res.finished === true) return undefined
  return fn(reply.request, reply, next)
}

function preHandlerCallback (err, reply) {
  if (reply.res.finished === true) return
  if (err) {
    reply.send(err)
    return
  }

  var result = reply.context.handler(reply.request, reply)
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
