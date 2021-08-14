'use strict'

const FJS = require('fast-json-stringify')
const statusCodes = require('http').STATUS_CODES
const setErrorHeaders = require('./setErrorHeaders')
const wrapThenable = require('./wrapThenable')
const {
  kReplyHeaders, kReplyNextErrorHandler, kReplyIsRunningOnErrorHook, kReplySent, kReplyHasStatusCode
} = require('./symbols.js')

const { getSchemaSerializer } = require('./schemas')

const serializeError = FJS({
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    code: { type: 'string' },
    error: { type: 'string' },
    message: { type: 'string' }
  }
})

const rootErrorHandler = {
  func: defaultErrorHandler,
  toJSON () {
    return this.func.name.toString() + '()'
  }
}

function handleError (reply, error, cb) {
  reply[kReplyIsRunningOnErrorHook] = false
  const res = reply.raw

  const context = reply.context
  const errorHandler = reply[kReplyNextErrorHandler] || context.errorHandler

  // In case we the error handler throws, we set the next errorHandler so we can error again
  reply[kReplyNextErrorHandler] = Object.getPrototypeOf(errorHandler)
  
  reply[kReplyHeaders]['content-length'] = undefined

  const func = errorHandler.func

  if (!func) {
    fallbackErrorHandler(error, reply, cb)
    return
  }

  console.log('calling the error handler')
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
  console.log('defaultErrorHandler', reply.statusCode, error.statusCode, reply[kReplyHasStatusCode])
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
  console.log('fallbackErrorHandler', reply.statusCode, error.statusCode, reply[kReplyHasStatusCode])
  const res = reply.raw
  const statusCode = reply.statusCode
  console.log(statusCode)
  let payload
  try {
    const serializerFn = getSchemaSerializer(reply.context, statusCode)
    payload = (serializerFn === false)
      ? serializeError({
          error: statusCodes[statusCode + ''],
          code: error.code,
          message: error.message || '',
          statusCode: statusCode
        })
      : serializerFn(Object.create(error, {
        error: { value: statusCodes[statusCode + ''] },
        message: { value: error.message || '' },
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

  reply[kReplyHeaders]['content-type'] = 'application/json; charset=utf-8'
  reply[kReplyHeaders]['content-length'] = '' + Buffer.byteLength(payload)

  reply[kReplySent] = true

  console.log('headerSent', res._headerSent)

  console.log(cb)
  cb(reply, payload)

  
  res.writeHead(statusCode, reply[kReplyHeaders])
  res.end(payload)
 
}

function buildErrorHandler (parent = rootErrorHandler, func) {
  if (!func) {
    return parent
  }

  const errorHandler = Object.create(parent)
  errorHandler.func = func
  return errorHandler
}

module.exports = {
  buildErrorHandler,
  handleError
}
