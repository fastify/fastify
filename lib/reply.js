'use strict'

const eos = require('stream').finished

const {
  kFourOhFourContext,
  kReplyErrorHandlerCalled,
  kReplyHijacked,
  kReplyStartTime,
  kReplyEndTime,
  kReplySerializer,
  kReplySerializerDefault,
  kReplyIsError,
  kReplyHeaders,
  kReplyTrailers,
  kReplyHasStatusCode,
  kReplyIsRunningOnErrorHook,
  kReplyNextErrorHandler,
  kDisableRequestLogging,
  kSchemaResponse,
  kReplySerializeWeakMap,
  kSchemaController,
  kOptions,
  kRouteContext
} = require('./symbols.js')
const { hookRunner, hookIterator, onSendHookRunner } = require('./hooks')

const internals = require('./handleRequest')[Symbol.for('internals')]
const loggerUtils = require('./logger')
const now = loggerUtils.now
const { handleError } = require('./error-handler')
const { getSchemaSerializer } = require('./schemas')

const CONTENT_TYPE = {
  JSON: 'application/json; charset=utf-8',
  PLAIN: 'text/plain; charset=utf-8',
  OCTET: 'application/octet-stream'
}
const {
  FST_ERR_REP_INVALID_PAYLOAD_TYPE,
  FST_ERR_REP_ALREADY_SENT,
  FST_ERR_REP_SENT_VALUE,
  FST_ERR_SEND_INSIDE_ONERR,
  FST_ERR_BAD_STATUS_CODE,
  FST_ERR_BAD_TRAILER_NAME,
  FST_ERR_BAD_TRAILER_VALUE,
  FST_ERR_MISSING_SERIALIZATION_FN
} = require('./errors')
const warning = require('./warnings')

function Reply (res, request, log) {
  this.raw = res
  this[kReplySerializer] = null
  this[kReplyErrorHandlerCalled] = false
  this[kReplyIsError] = false
  this[kReplyIsRunningOnErrorHook] = false
  this.request = request
  this[kReplyHeaders] = {}
  this[kReplyTrailers] = null
  this[kReplyHasStatusCode] = false
  this[kReplyStartTime] = undefined
  this.log = log
}
Reply.props = []

Object.defineProperties(Reply.prototype, {
  [kRouteContext]: {
    get () {
      return this.request[kRouteContext]
    }
  },
  // TODO: remove once v5 is done
  // Is temporary to avoid constant conflicts between `next` and `main`
  context: {
    get () {
      return this.request[kRouteContext]
    }
  },
  server: {
    get () {
      return this.request[kRouteContext].server
    }
  },
  sent: {
    enumerable: true,
    get () {
      // We are checking whether reply was hijacked or the response has ended.
      return (this[kReplyHijacked] || this.raw.writableEnded) === true
    },
    set (value) {
      warning.emit('FSTDEP010')

      if (value !== true) {
        throw new FST_ERR_REP_SENT_VALUE()
      }

      // We throw only if sent was overwritten from Fastify
      if (this.sent && this[kReplyHijacked]) {
        throw new FST_ERR_REP_ALREADY_SENT()
      }

      this[kReplyHijacked] = true
    }
  },
  statusCode: {
    get () {
      return this.raw.statusCode
    },
    set (value) {
      this.code(value)
    }
  }
})

Reply.prototype.hijack = function () {
  this[kReplyHijacked] = true
  return this
}

Reply.prototype.send = function (payload) {
  if (this[kReplyIsRunningOnErrorHook] === true) {
    throw new FST_ERR_SEND_INSIDE_ONERR()
  }

  if (this.sent) {
    this.log.warn({ err: new FST_ERR_REP_ALREADY_SENT() }, 'Reply already sent')
    return this
  }

  if (payload instanceof Error || this[kReplyIsError] === true) {
    this[kReplyIsError] = false
    onErrorHook(this, payload, onSendHook)
    return this
  }

  if (payload === undefined) {
    onSendHook(this, payload)
    return this
  }

  const contentType = this.getHeader('content-type')
  const hasContentType = contentType !== undefined

  if (payload !== null) {
    if (typeof payload.pipe === 'function') {
      onSendHook(this, payload)
      return this
    }

    if (Buffer.isBuffer(payload)) {
      if (hasContentType === false) {
        this[kReplyHeaders]['content-type'] = CONTENT_TYPE.OCTET
      }
      onSendHook(this, payload)
      return this
    }

    if (hasContentType === false && typeof payload === 'string') {
      this[kReplyHeaders]['content-type'] = CONTENT_TYPE.PLAIN
      onSendHook(this, payload)
      return this
    }
  }

  if (this[kReplySerializer] !== null) {
    if (typeof payload !== 'string') {
      preserializeHook(this, payload)
      return this
    } else {
      payload = this[kReplySerializer](payload)
    }

  // The indexOf below also matches custom json mimetypes such as 'application/hal+json' or 'application/ld+json'
  } else if (hasContentType === false || contentType.indexOf('json') > -1) {
    if (hasContentType === false) {
      this[kReplyHeaders]['content-type'] = CONTENT_TYPE.JSON
    } else {
      // If user doesn't set charset, we will set charset to utf-8
      if (contentType.indexOf('charset') === -1) {
        const customContentType = contentType.trim()
        if (customContentType.endsWith(';')) {
          // custom content-type is ended with ';'
          this[kReplyHeaders]['content-type'] = `${customContentType} charset=utf-8`
        } else {
          this[kReplyHeaders]['content-type'] = `${customContentType}; charset=utf-8`
        }
      }
    }
    if (typeof payload !== 'string') {
      preserializeHook(this, payload)
      return this
    }
  }

  onSendHook(this, payload)

  return this
}

Reply.prototype.getHeader = function (key) {
  key = key.toLowerCase()
  const res = this.raw
  let value = this[kReplyHeaders][key]
  if (value === undefined && res.hasHeader(key)) {
    value = res.getHeader(key)
  }
  return value
}

Reply.prototype.getHeaders = function () {
  return {
    ...this.raw.getHeaders(),
    ...this[kReplyHeaders]
  }
}

Reply.prototype.hasHeader = function (key) {
  key = key.toLowerCase()

  return this[kReplyHeaders][key] !== undefined || this.raw.hasHeader(key)
}

Reply.prototype.removeHeader = function (key) {
  // Node.js does not like headers with keys set to undefined,
  // so we have to delete the key.
  delete this[kReplyHeaders][key.toLowerCase()]
  return this
}

Reply.prototype.header = function (key, value = '') {
  key = key.toLowerCase()

  if (this[kReplyHeaders][key] && key === 'set-cookie') {
    // https://tools.ietf.org/html/rfc7230#section-3.2.2
    if (typeof this[kReplyHeaders][key] === 'string') {
      this[kReplyHeaders][key] = [this[kReplyHeaders][key]]
    }

    if (Array.isArray(value)) {
      this[kReplyHeaders][key].push(...value)
    } else {
      this[kReplyHeaders][key].push(value)
    }
  } else {
    this[kReplyHeaders][key] = value
  }

  return this
}

Reply.prototype.headers = function (headers) {
  const keys = Object.keys(headers)
  /* eslint-disable no-var */
  for (var i = 0; i !== keys.length; ++i) {
    const key = keys[i]
    this.header(key, headers[key])
  }

  return this
}

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer#directives
// https://httpwg.org/specs/rfc7230.html#chunked.trailer.part
const INVALID_TRAILERS = new Set([
  'transfer-encoding',
  'content-length',
  'host',
  'cache-control',
  'max-forwards',
  'te',
  'authorization',
  'set-cookie',
  'content-encoding',
  'content-type',
  'content-range',
  'trailer'
])

Reply.prototype.trailer = function (key, fn) {
  key = key.toLowerCase()
  if (INVALID_TRAILERS.has(key)) {
    throw new FST_ERR_BAD_TRAILER_NAME(key)
  }
  if (typeof fn !== 'function') {
    throw new FST_ERR_BAD_TRAILER_VALUE(key, typeof fn)
  }
  if (this[kReplyTrailers] === null) this[kReplyTrailers] = {}
  this[kReplyTrailers][key] = fn
  return this
}

Reply.prototype.hasTrailer = function (key) {
  return this[kReplyTrailers]?.[key.toLowerCase()] !== undefined
}

Reply.prototype.removeTrailer = function (key) {
  if (this[kReplyTrailers] === null) return this
  this[kReplyTrailers][key.toLowerCase()] = undefined
  return this
}

Reply.prototype.code = function (code) {
  const intValue = Number(code)
  if (isNaN(intValue) || intValue < 100 || intValue > 599) {
    throw new FST_ERR_BAD_STATUS_CODE(code || String(code))
  }

  this.raw.statusCode = intValue
  this[kReplyHasStatusCode] = true
  return this
}

Reply.prototype.status = Reply.prototype.code

Reply.prototype.getSerializationFunction = function (schemaOrStatus) {
  let serialize

  if (typeof schemaOrStatus === 'string' || typeof schemaOrStatus === 'number') {
    serialize = this[kRouteContext][kSchemaResponse]?.[schemaOrStatus]
  } else if (typeof schemaOrStatus === 'object') {
    serialize = this[kRouteContext][kReplySerializeWeakMap]?.get(schemaOrStatus)
  }

  return serialize
}

Reply.prototype.compileSerializationSchema = function (schema, httpStatus = null) {
  const { request } = this
  const { method, url } = request

  // Check if serialize function already compiled
  if (this[kRouteContext][kReplySerializeWeakMap]?.has(schema)) {
    return this[kRouteContext][kReplySerializeWeakMap].get(schema)
  }

  const serializerCompiler = this[kRouteContext].serializerCompiler ||
   this.server[kSchemaController].serializerCompiler ||
  (
    // We compile the schemas if no custom serializerCompiler is provided
    // nor set
    this.server[kSchemaController].setupSerializer(this.server[kOptions]) ||
    this.server[kSchemaController].serializerCompiler
  )

  const serializeFn = serializerCompiler({
    schema,
    method,
    url,
    httpStatus
  })

  // We create a WeakMap to compile the schema only once
  // Its done leazily to avoid add overhead by creating the WeakMap
  // if it is not used
  // TODO: Explore a central cache for all the schemas shared across
  // encapsulated contexts
  if (this[kRouteContext][kReplySerializeWeakMap] == null) {
    this[kRouteContext][kReplySerializeWeakMap] = new WeakMap()
  }

  this[kRouteContext][kReplySerializeWeakMap].set(schema, serializeFn)

  return serializeFn
}

Reply.prototype.serializeInput = function (input, schema, httpStatus) {
  let serialize
  httpStatus = typeof schema === 'string' || typeof schema === 'number'
    ? schema
    : httpStatus

  if (httpStatus != null) {
    serialize = this[kRouteContext][kSchemaResponse]?.[httpStatus]

    if (serialize == null) throw new FST_ERR_MISSING_SERIALIZATION_FN(httpStatus)
  } else {
    // Check if serialize function already compiled
    if (this[kRouteContext][kReplySerializeWeakMap]?.has(schema)) {
      serialize = this[kRouteContext][kReplySerializeWeakMap].get(schema)
    } else {
      serialize = this.compileSerializationSchema(schema, httpStatus)
    }
  }

  return serialize(input)
}

Reply.prototype.serialize = function (payload) {
  if (this[kReplySerializer] !== null) {
    return this[kReplySerializer](payload)
  } else {
    if (this[kRouteContext] && this[kRouteContext][kReplySerializerDefault]) {
      return this[kRouteContext][kReplySerializerDefault](payload, this.raw.statusCode)
    } else {
      return serialize(this[kRouteContext], payload, this.raw.statusCode)
    }
  }
}

Reply.prototype.serializer = function (fn) {
  this[kReplySerializer] = fn
  return this
}

Reply.prototype.type = function (type) {
  this[kReplyHeaders]['content-type'] = type
  return this
}

Reply.prototype.redirect = function (code, url) {
  if (typeof code === 'string') {
    url = code
    code = this[kReplyHasStatusCode] ? this.raw.statusCode : 302
  }

  return this.header('location', url).code(code).send()
}

Reply.prototype.callNotFound = function () {
  notFound(this)
  return this
}

Reply.prototype.getResponseTime = function () {
  let responseTime = 0

  if (this[kReplyStartTime] !== undefined) {
    responseTime = (this[kReplyEndTime] || now()) - this[kReplyStartTime]
  }

  return responseTime
}

// Make reply a thenable, so it could be used with async/await.
// See
// - https://github.com/fastify/fastify/issues/1864 for the discussions
// - https://promisesaplus.com/ for the definition of thenable
// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then for the signature
Reply.prototype.then = function (fulfilled, rejected) {
  if (this.sent) {
    fulfilled()
    return
  }

  eos(this.raw, (err) => {
    // We must not treat ERR_STREAM_PREMATURE_CLOSE as
    // an error because it is created by eos, not by the stream.
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      if (rejected) {
        rejected(err)
      } else {
        this.log && this.log.warn('unhandled rejection on reply.then')
      }
    } else {
      fulfilled()
    }
  })
}

function preserializeHook (reply, payload) {
  if (reply[kRouteContext].preSerialization !== null) {
    onSendHookRunner(
      reply[kRouteContext].preSerialization,
      reply.request,
      reply,
      payload,
      preserializeHookEnd
    )
  } else {
    preserializeHookEnd(null, reply.request, reply, payload)
  }
}

function preserializeHookEnd (err, request, reply, payload) {
  if (err != null) {
    onErrorHook(reply, err)
    return
  }

  try {
    if (reply[kReplySerializer] !== null) {
      payload = reply[kReplySerializer](payload)
    } else if (reply[kRouteContext] && reply[kRouteContext][kReplySerializerDefault]) {
      payload = reply[kRouteContext][kReplySerializerDefault](payload, reply.raw.statusCode)
    } else {
      payload = serialize(reply[kRouteContext], payload, reply.raw.statusCode)
    }
  } catch (e) {
    wrapSeralizationError(e, reply)
    onErrorHook(reply, e)
    return
  }

  onSendHook(reply, payload)
}

function wrapSeralizationError (error, reply) {
  error.serialization = reply[kRouteContext].config
}

function onSendHook (reply, payload) {
  if (reply[kRouteContext].onSend !== null) {
    onSendHookRunner(
      reply[kRouteContext].onSend,
      reply.request,
      reply,
      payload,
      wrapOnSendEnd
    )
  } else {
    onSendEnd(reply, payload)
  }
}

function wrapOnSendEnd (err, request, reply, payload) {
  if (err != null) {
    onErrorHook(reply, err)
  } else {
    onSendEnd(reply, payload)
  }
}

function onSendEnd (reply, payload) {
  const res = reply.raw
  const req = reply.request
  const statusCode = res.statusCode

  // we check if we need to update the trailers header and set it
  if (reply[kReplyTrailers] !== null) {
    const trailerHeaders = Object.keys(reply[kReplyTrailers])
    let header = ''
    for (const trailerName of trailerHeaders) {
      if (typeof reply[kReplyTrailers][trailerName] !== 'function') continue
      header += ' '
      header += trailerName
    }
    // it must be chunked for trailer to work
    reply.header('Transfer-Encoding', 'chunked')
    reply.header('Trailer', header.trim())
  }

  if (payload === undefined || payload === null) {
    // according to https://tools.ietf.org/html/rfc7230#section-3.3.2
    // we cannot send a content-length for 304 and 204, and all status code
    // < 200
    // A sender MUST NOT send a Content-Length header field in any message
    // that contains a Transfer-Encoding header field.
    // For HEAD we don't overwrite the `content-length`
    if (statusCode >= 200 && statusCode !== 204 && statusCode !== 304 && req.method !== 'HEAD' && reply[kReplyTrailers] === null) {
      reply[kReplyHeaders]['content-length'] = '0'
    }

    res.writeHead(statusCode, reply[kReplyHeaders])
    sendTrailer(payload, res, reply)
    // avoid ArgumentsAdaptorTrampoline from V8
    res.end(null, null, null)
    return
  }

  if (typeof payload.pipe === 'function') {
    sendStream(payload, res, reply)
    return
  }

  if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
    throw new FST_ERR_REP_INVALID_PAYLOAD_TYPE(typeof payload)
  }

  if (reply[kReplyTrailers] === null) {
    const contentLength = reply[kReplyHeaders]['content-length']
    if (!contentLength ||
        (req.raw.method !== 'HEAD' &&
         Number(contentLength) !== Buffer.byteLength(payload)
        )
    ) {
      reply[kReplyHeaders]['content-length'] = '' + Buffer.byteLength(payload)
    }
  }

  res.writeHead(statusCode, reply[kReplyHeaders])
  // write payload first
  res.write(payload)
  // then send trailers
  sendTrailer(payload, res, reply)
  // avoid ArgumentsAdaptorTrampoline from V8
  res.end(null, null, null)
}

function logStreamError (logger, err, res) {
  if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    if (!logger[kDisableRequestLogging]) {
      logger.info({ res }, 'stream closed prematurely')
    }
  } else {
    logger.warn({ err }, 'response terminated with an error with headers already sent')
  }
}

function sendStream (payload, res, reply) {
  let sourceOpen = true
  let errorLogged = false

  // set trailer when stream ended
  sendStreamTrailer(payload, res, reply)

  eos(payload, { readable: true, writable: false }, function (err) {
    sourceOpen = false
    if (err != null) {
      if (res.headersSent || reply.request.raw.aborted === true) {
        if (!errorLogged) {
          errorLogged = true
          logStreamError(reply.log, err, res)
        }
        res.destroy()
      } else {
        onErrorHook(reply, err)
      }
    }
    // there is nothing to do if there is not an error
  })

  eos(res, function (err) {
    if (sourceOpen) {
      if (err != null && res.headersSent && !errorLogged) {
        errorLogged = true
        logStreamError(reply.log, err, res)
      }
      if (typeof payload.destroy === 'function') {
        payload.destroy()
      } else if (typeof payload.close === 'function') {
        payload.close(noop)
      } else if (typeof payload.abort === 'function') {
        payload.abort()
      } else {
        reply.log.warn('stream payload does not end properly')
      }
    }
  })

  // streams will error asynchronously, and we want to handle that error
  // appropriately, e.g. a 404 for a missing file. So we cannot use
  // writeHead, and we need to resort to setHeader, which will trigger
  // a writeHead when there is data to send.
  if (!res.headersSent) {
    for (const key in reply[kReplyHeaders]) {
      res.setHeader(key, reply[kReplyHeaders][key])
    }
  } else {
    reply.log.warn('response will send, but you shouldn\'t use res.writeHead in stream mode')
  }
  payload.pipe(res)
}

function sendTrailer (payload, res, reply) {
  if (reply[kReplyTrailers] === null) return
  const trailerHeaders = Object.keys(reply[kReplyTrailers])
  const trailers = {}
  for (const trailerName of trailerHeaders) {
    if (typeof reply[kReplyTrailers][trailerName] !== 'function') continue
    trailers[trailerName] = reply[kReplyTrailers][trailerName](reply, payload)
  }
  res.addTrailers(trailers)
}

function sendStreamTrailer (payload, res, reply) {
  if (reply[kReplyTrailers] === null) return
  payload.on('end', () => sendTrailer(null, res, reply))
}

function onErrorHook (reply, error, cb) {
  if (reply[kRouteContext].onError !== null && !reply[kReplyNextErrorHandler]) {
    reply[kReplyIsRunningOnErrorHook] = true
    onSendHookRunner(
      reply[kRouteContext].onError,
      reply.request,
      reply,
      error,
      () => handleError(reply, error, cb)
    )
  } else {
    handleError(reply, error, cb)
  }
}

function setupResponseListeners (reply) {
  reply[kReplyStartTime] = now()

  const onResFinished = err => {
    reply[kReplyEndTime] = now()
    reply.raw.removeListener('finish', onResFinished)
    reply.raw.removeListener('error', onResFinished)

    const ctx = reply[kRouteContext]

    if (ctx && ctx.onResponse !== null) {
      hookRunner(
        ctx.onResponse,
        onResponseIterator,
        reply.request,
        reply,
        onResponseCallback
      )
    } else {
      onResponseCallback(err, reply.request, reply)
    }
  }

  reply.raw.on('finish', onResFinished)
  reply.raw.on('error', onResFinished)
}

function onResponseIterator (fn, request, reply, next) {
  return fn(request, reply, next)
}

function onResponseCallback (err, request, reply) {
  if (reply.log[kDisableRequestLogging]) {
    return
  }

  const responseTime = reply.getResponseTime()

  if (err != null) {
    reply.log.error({
      res: reply,
      err,
      responseTime
    }, 'request errored')
    return
  }

  reply.log.info({
    res: reply,
    responseTime
  }, 'request completed')
}

function buildReply (R) {
  const props = [...R.props]

  function _Reply (res, request, log) {
    this.raw = res
    this[kReplyIsError] = false
    this[kReplyErrorHandlerCalled] = false
    this[kReplyHijacked] = false
    this[kReplySerializer] = null
    this.request = request
    this[kReplyHeaders] = {}
    this[kReplyTrailers] = null
    this[kReplyStartTime] = undefined
    this[kReplyEndTime] = undefined
    this.log = log

    // eslint-disable-next-line no-var
    var prop
    // eslint-disable-next-line no-var
    for (var i = 0; i < props.length; i++) {
      prop = props[i]
      this[prop.key] = prop.value
    }
  }
  Object.setPrototypeOf(_Reply.prototype, R.prototype)
  Object.setPrototypeOf(_Reply, R)
  _Reply.parent = R
  _Reply.props = props
  return _Reply
}

function notFound (reply) {
  if (reply[kRouteContext][kFourOhFourContext] === null) {
    reply.log.warn('Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
    reply.code(404).send('404 Not Found')
    return
  }

  reply.request[kRouteContext] = reply[kRouteContext][kFourOhFourContext]

  // preHandler hook
  if (reply[kRouteContext].preHandler !== null) {
    hookRunner(
      reply[kRouteContext].preHandler,
      hookIterator,
      reply.request,
      reply,
      internals.preHandlerCallback
    )
  } else {
    internals.preHandlerCallback(null, reply.request, reply)
  }
}

/**
 * This function runs when a payload that is not a string|buffer|stream or null
 * should be serialized to be streamed to the response.
 * This is the default serializer that can be customized by the user using the replySerializer
 *
 * @param {object} context the request context
 * @param {object} data the JSON payload to serialize
 * @param {number} statusCode the http status code
 * @returns {string} the serialized payload
 */
function serialize (context, data, statusCode) {
  const fnSerialize = getSchemaSerializer(context, statusCode)
  if (fnSerialize) {
    return fnSerialize(data)
  }
  return JSON.stringify(data)
}

function noop () { }

module.exports = Reply
module.exports.buildReply = buildReply
module.exports.setupResponseListeners = setupResponseListeners
