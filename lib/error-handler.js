'use strict'

const statusCodes = require('node:http').STATUS_CODES
const wrapThenable = require('./wrap-thenable.js')
const { setErrorStatusCode } = require('./error-status.js')
const {
  kReplyHeaders,
  kReplyNextErrorHandler,
  kReplyIsRunningOnErrorHook,
  kRouteContext,
  kLogController,
  kDiagnosticsStore
} = require('./symbols.js')

const {
  FST_ERR_FAILED_ERROR_SERIALIZATION
} = require('./errors')

const { getOutputValidator } = require('./schemas')
const { validateOutput } = require('./validation')

const serializeError = require('./error-serializer')
const rootErrorHandler = {
  func: defaultErrorHandler,
  toJSON () {
    return this.func.name.toString() + '()'
  }
}

function handleError (reply, error, cb) {
  reply[kReplyIsRunningOnErrorHook] = false

  const context = reply[kRouteContext]
  if (reply[kReplyNextErrorHandler] === false) {
    fallbackErrorHandler(error, reply, function (reply, payload) {
      if (reply.raw.headersSent === true || reply.raw.destroyed === true) {
        // The response has already started transmitting (e.g. an active
        // stream that timed out after its headers were sent). We cannot
        // write a new error response, so abort the in-flight response
        // instead of raising an uncaught ERR_HTTP_HEADERS_SENT.
        reply.raw.destroy(error)
        return
      }
      try {
        reply.raw.writeHead(reply.raw.statusCode, reply[kReplyHeaders])
      } catch (error) {
        reply.server[kLogController].writeHeadError(error, reply.request, reply)
        // If the response has started transmitting, retrying writeHead
        // would raise an uncaught ERR_HTTP_HEADERS_SENT and terminate the
        // process, so abort the in-flight response instead.
        if (error.code === 'ERR_HTTP_HEADERS_SENT' || reply.raw.headersSent === true || reply.raw.destroyed === true) {
          reply.raw.destroy(error)
          return
        }
        // For other writeHead failures (e.g. an invalid header value in
        // the error payload) retry without the offending headers.
        reply.raw.writeHead(reply.raw.statusCode)
      }
      reply.raw.end(payload)
    })
    return
  }
  const errorHandler = reply[kReplyNextErrorHandler] || context.errorHandler

  // In case the error handler throws, we set the next errorHandler so we can error again
  reply[kReplyNextErrorHandler] = Object.getPrototypeOf(errorHandler)

  // we need to remove content-type to allow content-type guessing for serialization
  delete reply[kReplyHeaders]['content-type']
  delete reply[kReplyHeaders]['content-length']

  const func = errorHandler.func

  if (!func) {
    reply[kReplyNextErrorHandler] = false
    fallbackErrorHandler(error, reply, cb)
    return
  }

  try {
    const result = func(error, reply.request, reply)
    if (result !== undefined) {
      if (result !== null && typeof result.then === 'function') {
        const store = reply[kDiagnosticsStore] || null
        wrapThenable(result, reply, store)
      } else {
        reply.send(result)
      }
    }
  } catch (err) {
    reply.send(err)
  }
}

function defaultErrorHandler (error, request, reply) {
  setErrorHeaders(error, reply)
  setErrorStatusCode(reply, error)
  request.server[kLogController].defaultErrorLog(error, request, reply)
  reply.send(error)
}

function fallbackErrorHandler (error, reply, cb) {
  const res = reply.raw
  const statusCode = reply.statusCode
  reply[kReplyHeaders]['content-type'] = reply[kReplyHeaders]['content-type'] ?? 'application/json; charset=utf-8'
  let payload
  try {
    const validate = getOutputValidator(reply[kRouteContext], statusCode, reply[kReplyHeaders]['content-type'])
    if (validate === false) {
      payload = serializeError({
        error: statusCodes[statusCode + ''],
        code: error.code,
        message: error.message,
        statusCode
      })
    } else {
      // The error own enumerable properties are kept, so a route error schema
      // can declare them. The output validator shapes the body in place.
      const body = Object.assign({}, error, {
        statusCode,
        code: error.code,
        error: statusCodes[statusCode + ''],
        message: error.message
      })
      validateOutput(validate, body)
      payload = JSON.stringify(body)
    }
  } catch (err) {
    // the error body does not match the route error schema, or it cannot be
    // stringified (e.g. a BigInt property)
    reply.server[kLogController].serializerError(err, reply.request, reply, { statusCode: res.statusCode })

    reply.code(500)
    payload = serializeError(new FST_ERR_FAILED_ERROR_SERIALIZATION(err.message, error.message))
  }

  reply[kReplyHeaders]['content-length'] = '' + Buffer.byteLength(payload)

  cb(reply, payload)
}

function buildErrorHandler (parent = rootErrorHandler, func) {
  if (!func) {
    return parent
  }

  const errorHandler = Object.create(parent)
  errorHandler.func = func
  return errorHandler
}

function setErrorHeaders (error, reply) {
  const res = reply.raw
  let statusCode = res.statusCode
  statusCode = (statusCode >= 400 && statusCode <= 599) ? statusCode : 500
  // treat undefined and null as same
  if (error != null) {
    if (error.headers !== undefined) {
      reply.headers(error.headers)
    }
    if (error.statusCode >= 400 && error.statusCode <= 599) {
      statusCode = error.statusCode
    } else if (error.status >= 400 && error.status <= 599) {
      statusCode = error.status
    }
  }
  res.statusCode = statusCode
}

module.exports = {
  buildErrorHandler,
  handleError
}
