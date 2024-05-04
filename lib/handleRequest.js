'use strict'

const { validate: validateSchema } = require('./validation')
const { preValidationHookRunner, preHandlerHookRunner } = require('./hooks')
const wrapThenable = require('./wrapThenable')
const {
  kReplyIsError,
  kRouteContext
} = require('./symbols')

function handleRequest (err, request, reply) {
  if (reply.sent === true) return
  if (err != null) {
    reply[kReplyIsError] = true
    reply.send(err)
    return
  }

  const method = request.raw.method
  const headers = request.headers
  const context = request[kRouteContext]

  if (method === 'GET' || method === 'HEAD') {
    handler(request, reply)
    return
  }

  const contentType = headers['content-type']

  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'TRACE' || method === 'SEARCH' ||
    method === 'PROPFIND' || method === 'PROPPATCH' || method === 'LOCK' || method === 'REPORT' || method === 'MKCALENDAR') {
    if (contentType === undefined) {
      if (
        headers['transfer-encoding'] === undefined &&
        (headers['content-length'] === '0' || headers['content-length'] === undefined)
      ) { // Request has no body to parse
        handler(request, reply)
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
      handler(request, reply)
    }
    return
  }

  // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
  handler(request, reply)
}

function handler (request, reply) {
  try {
    if (request[kRouteContext].preValidation !== null) {
      preValidationHookRunner(
        request[kRouteContext].preValidation,
        request,
        reply,
        preValidationCallback
      )
    } else {
      preValidationCallback(null, request, reply)
    }
  } catch (err) {
    preValidationCallback(err, request, reply)
  }
}

function preValidationCallback (err, request, reply) {
  if (reply.sent === true) return

  if (err != null) {
    reply[kReplyIsError] = true
    reply.send(err)
    return
  }

  const validationErr = validateSchema(reply[kRouteContext], request)
  const isAsync = (validationErr && typeof validationErr.then === 'function') || false

  if (isAsync) {
    const cb = validationCompleted.bind(null, request, reply)
    validationErr.then(cb, cb)
  } else {
    validationCompleted(request, reply, validationErr)
  }
}

function validationCompleted (request, reply, validationErr) {
  if (validationErr) {
    if (reply[kRouteContext].attachValidation === false) {
      reply.send(validationErr)
      return
    }

    reply.request.validationError = validationErr
  }

  // preHandler hook
  if (request[kRouteContext].preHandler !== null) {
    preHandlerHookRunner(
      request[kRouteContext].preHandler,
      request,
      reply,
      preHandlerCallback
    )
  } else {
    preHandlerCallback(null, request, reply)
  }
}

function preHandlerCallback (err, request, reply) {
  if (reply.sent) return

  if (err != null) {
    reply[kReplyIsError] = true
    reply.send(err)
    return
  }

  let result

  try {
    result = request[kRouteContext].handler(request, reply)
  } catch (err) {
    reply[kReplyIsError] = true
    reply.send(err)
    return
  }

  if (result !== undefined) {
    if (result !== null && typeof result.then === 'function') {
      wrapThenable(result, reply)
    } else {
      reply.send(result)
    }
  }
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { handler, preHandlerCallback }
