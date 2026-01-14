'use strict'

const { Readable } = require('node:stream')
const { onRequestHookRunner, onSendHookRunner, onResponseHookRunner } = require('./hooks')
const { getGenReqId } = require('./req-id-gen-factory.js')
const { createChildLogger } = require('./logger-factory.js')

const {
  kReply,
  kRequest,
  kErrorHandler,
  kBodyLimit,
  kLogLevel,
  kChildLoggerFactory,
  kReplyIsError,
  kDisableRequestLogging,
  kRequestAcceptVersion,
  kWebRoute
} = require('./symbols.js')

function WebContext ({
  handler,
  config,
  errorHandler,
  logLevel,
  logSerializers,
  server
}) {
  this.handler = handler
  this.config = config
  this.Reply = server[kReply]
  this.Request = server[kRequest]
  this.onRequest = null
  this.onSend = null
  this.onResponse = null
  this.onError = null
  this.logLevel = logLevel || server[kLogLevel]
  this.logSerializers = logSerializers
  this.errorHandler = errorHandler || server[kErrorHandler]
  this.childLoggerFactory = server[kChildLoggerFactory]
  this.server = server
  this[kWebRoute] = true
  this._parserOptions = {
    limit: server[kBodyLimit]
  }
}

function createWebRequest (req, protocol, host) {
  const url = new URL(req.url, `${protocol}://${host}`)
  const headers = new Headers()

  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  const init = {
    method: req.method,
    headers
  }

  // Only add body for methods that may have one
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'TRACE') {
    init.body = Readable.toWeb(req)
    init.duplex = 'half'
  }

  return new Request(url, init)
}

async function sendWebResponse (res, webResponse) {
  res.statusCode = webResponse.status

  for (const [name, value] of webResponse.headers) {
    // Handle multiple values for same header (like Set-Cookie)
    const existing = res.getHeader(name)
    if (existing !== undefined) {
      res.setHeader(name, [].concat(existing, value))
    } else {
      res.setHeader(name, value)
    }
  }

  if (webResponse.body === null) {
    res.end()
    return
  }

  const reader = webResponse.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } finally {
    reader.releaseLock()
    res.end()
  }
}

function buildWebRouteHandler (options) {
  const {
    logger,
    hasLogger,
    disableRequestLogging,
    disableRequestLoggingFn,
    keepAliveConnections,
    return503OnClosing,
    setupResponseListeners
  } = options

  let closing = false

  function closeWebRoutes () {
    closing = true
  }

  function webRouteHandler (req, res, params, context, query) {
    const id = getGenReqId(context.server, req)

    const loggerOpts = {
      level: context.logLevel
    }

    if (context.logSerializers) {
      loggerOpts.serializers = context.logSerializers
    }

    const childLogger = createChildLogger(context, logger, req, id, loggerOpts)
    childLogger[kDisableRequestLogging] = disableRequestLoggingFn ? false : disableRequestLogging

    if (closing === true) {
      if (req.httpVersionMajor !== 2) {
        res.setHeader('Connection', 'close')
      }

      if (return503OnClosing) {
        const headers = {
          'Content-Type': 'application/json',
          'Content-Length': '80'
        }
        res.writeHead(503, headers)
        res.end('{"error":"Service Unavailable","message":"Service Unavailable","statusCode":503}')
        childLogger.info({ res: { statusCode: 503 } }, 'request aborted - refusing to accept new requests as server is closing')
        return
      }
    }

    const connHeader = String.prototype.toLowerCase.call(req.headers.connection || '')
    if (connHeader === 'keep-alive') {
      if (keepAliveConnections.has(req.socket) === false) {
        keepAliveConnections.add(req.socket)
        req.socket.on('close', function removeTrackedSocket () {
          keepAliveConnections.delete(req.socket)
        })
      }
    }

    if (req.headers[kRequestAcceptVersion] !== undefined) {
      req.headers['accept-version'] = req.headers[kRequestAcceptVersion]
      req.headers[kRequestAcceptVersion] = undefined
    }

    // Create minimal FastifyRequest/Reply for hooks
    const request = new context.Request(id, params, req, query, childLogger, context)
    const reply = new context.Reply(res, request, childLogger)

    const resolvedDisableRequestLogging = disableRequestLoggingFn
      ? disableRequestLoggingFn(request)
      : disableRequestLogging
    childLogger[kDisableRequestLogging] = resolvedDisableRequestLogging

    if (resolvedDisableRequestLogging === false) {
      childLogger.info({ req: request }, 'incoming request')
    }

    if (hasLogger === true || context.onResponse !== null) {
      setupResponseListeners(reply)
    }

    // Create Web Standard Request
    const protocol = req.socket?.encrypted ? 'https' : 'http'
    const host = req.headers.host || 'localhost'
    const webRequest = createWebRequest(req, protocol, host)

    if (context.onRequest !== null) {
      onRequestHookRunner(
        context.onRequest,
        request,
        reply,
        function onRequestComplete (err) {
          if (err) {
            reply[kReplyIsError] = true
            reply.send(err)
            return
          }
          if (reply.sent === true) return
          runWebHandler(webRequest, request, reply, context)
        }
      )
    } else {
      runWebHandler(webRequest, request, reply, context)
    }
  }

  return { webRouteHandler, closeWebRoutes }
}

async function runWebHandler (webRequest, request, reply, context) {
  try {
    // Create context object with logger and server
    const ctx = {
      log: request.log,
      server: context.server
    }

    // Call handler bound to fastify instance with ctx as second parameter
    const webResponse = await context.handler.call(context.server, webRequest, ctx)

    if (reply.sent === true) return

    // Validate response
    if (!(webResponse instanceof Response)) {
      const err = new Error('Web route handler must return a Response object')
      err.statusCode = 500
      reply[kReplyIsError] = true
      reply.send(err)
      return
    }

    // Run onSend hooks with the Response as payload
    if (context.onSend !== null) {
      onSendHookRunner(
        context.onSend,
        request,
        reply,
        webResponse,
        function onSendComplete (err, req, rep, payload) {
          if (err) {
            reply[kReplyIsError] = true
            reply.send(err)
            return
          }
          sendWebResponseWithCallback(reply.raw, payload, reply, context)
        }
      )
    } else {
      await sendWebResponseWithCallback(reply.raw, webResponse, reply, context)
    }
  } catch (err) {
    reply[kReplyIsError] = true
    reply.send(err)
  }
}

async function sendWebResponseWithCallback (res, webResponse, reply, context) {
  try {
    await sendWebResponse(res, webResponse)

    if (context.onResponse !== null) {
      onResponseHookRunner(
        context.onResponse,
        reply.request,
        reply,
        function onResponseComplete () {}
      )
    }
  } catch (err) {
    reply[kReplyIsError] = true
    reply.send(err)
  }
}

module.exports = {
  WebContext,
  createWebRequest,
  sendWebResponse,
  buildWebRouteHandler,
  runWebHandler
}
