/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const validation = require('./validation')
const validateSchema = validation.validate
const runHooks = require('./hookRunner').hookRunner
const wrapThenable = require('./wrapThenable')

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
    if (
      contentType !== undefined &&
      (
        headers['transfer-encoding'] !== undefined ||
        headers['content-length'] !== undefined
      )
    ) {
      context.contentTypeParser.run(contentType, handler, request, reply)
    } else {
      handler(reply)
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
    wrapThenable(result, reply)
  }
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { handler }
