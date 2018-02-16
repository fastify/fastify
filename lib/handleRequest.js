/* eslint-disable no-useless-return */
'use strict'

const fastJsonStringify = require('fast-json-stringify')
const urlUtil = require('url')
const validation = require('./validation')
const validateSchema = validation.validate
const runHooks = require('./hookRunner')

const schemas = require('./schemas.json')
const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

function handleRequest (req, res, params, context) {
  var method = req.method
  var headers = req.headers
  var request = new context.Request(params, req, urlUtil.parse(req.url, true).query, headers, req.log)
  var reply = new context.Reply(res, context, request)

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

  reply.code(405).send(new Error('Method Not Allowed: ' + method))
}

function handler (reply) {
  var valid = validateSchema(reply.context, reply.request)
  if (valid !== true) {
    reply.code(400).send(wrapValidationError(valid))
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
      .then((payload) => {
        // this is for async functions that
        // are using reply.send directly
        if (payload !== undefined || (reply.res.statusCode === 204 && !reply.sent)) {
          reply.send(payload)
        }
      })
      .catch((err) => {
        reply.sent = false
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
module.exports[Symbol.for('internals')] = { handler }
