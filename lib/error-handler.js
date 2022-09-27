'use strict'

const statusCodes = require('http').STATUS_CODES
const wrapThenable = require('./wrapThenable')
const {
  kReplyHeaders,
  kReplyNextErrorHandler,
  kReplyIsRunningOnErrorHook,
  kReplyHasStatusCode,
  kRouteContext
} = require('./symbols.js')

const {
  FST_ERR_REP_INVALID_PAYLOAD_TYPE
} = require('./errors')

const { getSchemaSerializer } = require('./schemas')

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
      try {
        reply.raw.writeHead(reply.raw.statusCode, reply[kReplyHeaders])
      } catch (error) {
        reply.log.warn(
          { req: reply.request, res: reply, err: error },
          error && error.message
        )
        reply.raw.writeHead(reply.raw.statusCode)
      }
      reply.raw.end(payload)
    })
    return
  }
  const errorHandler = reply[kReplyNextErrorHandler] || context.errorHandler

  // In case the error handler throws, we set the next errorHandler so we can error again
  reply[kReplyNextErrorHandler] = Object.getPrototypeOf(errorHandler)

  delete reply[kReplyHeaders]['content-length']

  const func = errorHandler.func

  if (!func) {
    reply[kReplyNextErrorHandler] = false
    fallbackErrorHandler(error, reply, cb)
    return
  }

  const result = func(error, reply.request, reply)
  if (result !== undefined) {
    if (result !== null && typeof result.then === 'function') {
      wrapThenable(result, reply)
    } else {
      reply.send(result)
    }
  }
}

function defaultErrorHandler (error, request, reply) {
  setErrorHeaders(error, reply)
  if (!reply[kReplyHasStatusCode] || reply.statusCode === 200) {
    const statusCode = error.statusCode || error.status
    reply.code(statusCode >= 400 ? statusCode : 500)
  }
  if (reply.statusCode < 500) {
    reply.log.info(
      { res: reply, err: error },
      error && error.message
    )
  } else {
    reply.log.error(
      { req: request, res: reply, err: error },
      error && error.message
    )
  }
  reply.send(error)
}

function fallbackErrorHandler (error, reply, cb) {
  const res = reply.raw
  const statusCode = reply.statusCode
  let payload
  try {
    const serializerFn = getSchemaSerializer(reply[kRouteContext], statusCode)
    payload = (serializerFn === false)
      ? serializeError({
        error: statusCodes[statusCode + ''],
        code: error.code,
        message: error.message,
        statusCode
      })
      : serializerFn(Object.create(error, {
        error: { value: statusCodes[statusCode + ''] },
        message: { value: error.message },
        statusCode: { value: statusCode }
      }))
  } catch (err) {
    // error is always FST_ERR_SCH_SERIALIZATION_BUILD because this is called from route/compileSchemasForSerialization
    reply.log.error({ err, statusCode: res.statusCode }, 'The serializer for the given status code failed')
    reply.code(500)
    payload = serializeError({
      error: statusCodes['500'],
      message: err.message,
      statusCode: 500
    })
  }

  if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
    payload = serializeError(new FST_ERR_REP_INVALID_PAYLOAD_TYPE(typeof payload))
  }

  reply[kReplyHeaders]['content-type'] = 'application/json; charset=utf-8'
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
  statusCode = (statusCode >= 400) ? statusCode : 500
  // treat undefined and null as same
  if (error != null) {
    if (error.headers !== undefined) {
      reply.headers(error.headers)
    }
    if (error.status >= 400) {
      statusCode = error.status
    } else if (error.statusCode >= 400) {
      statusCode = error.statusCode
    }
  }
  res.statusCode = statusCode
}

module.exports = {
  buildErrorHandler,
  handleError
}
