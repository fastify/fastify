'use strict'

const { defaultInitOptions } = require('./initial-config-validation')

/**
 * Internal logger layer that wraps Fastify's log calls with
 * request-lifecycle awareness (disable-check, level selection).
 * Keeps the surface intentionally small so hot paths stay fast.
 *
 * Users can extend this class to customize internal log lines.
 */
class LogController {
  /**
   * @param {object} [options]
   * @param {boolean | ((req: object) => boolean)} [options.disableRequestLogging=false]
   *   When `true` (or a function returning `true`), per-request log lines
   *   (incoming, completed, errors) are suppressed.
   * @param {string} [options.requestIdLogLabel='reqId']
   *   The label used for the request identifier when logging the request.
   */
  constructor (options) {
    const opts = options || {}
    this.disableRequestLogging = opts.disableRequestLogging || defaultInitOptions.disableRequestLogging
    this.isDisableRequestLoggingFunction = typeof this.disableRequestLogging === 'function'
    this.requestIdLogLabel = opts.requestIdLogLabel || defaultInitOptions.requestIdLogLabel
  }

  /**
   * Checks whether request logging is disabled for the given request.
   *
   * @param {object} req  Raw or Fastify request object.
   * @returns {boolean}   `true` when logging should be skipped.
   */
  isLogDisabled (req) {
    return this.isDisableRequestLoggingFunction
      ? this.disableRequestLogging(req)
      : this.disableRequestLogging
  }

  /**
   * Logs an incoming request at `info` level.
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  incomingRequest (request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    request.log.info({ req: request }, 'incoming request')
  }

  /**
   * Logs the outcome of a completed request.
   * Uses `error` level when an error is present, `info` otherwise.
   *
   * @param {Error | null | undefined} error  Error that occurred during the response, if any.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  requestCompleted (error, request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    if (error) {
      reply.log.error({ res: reply, err: error, responseTime: reply.elapsedTime }, 'request errored')
    } else {
      reply.log.info({ res: reply, responseTime: reply.elapsedTime }, 'request completed')
    }
  }

  /**
   * Logs an error handled by the default error handler.
   * Uses `error` for 5xx status codes, `info` for 4xx.
   *
   * @param {Error} error         The error being handled.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object (must have `statusCode`).
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  defaultErrorLog (error, request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    if (reply.statusCode >= 500) {
      reply.log.error({ req: request, res: reply, err: error }, error?.message)
    } else {
      reply.log.info({ res: reply, err: error }, error?.message)
    }
  }

  /**
   * Logs stream-level errors that occur after headers have been sent.
   * Premature closes are logged at `info`; other errors at `warn`.
   *
   * @param {Error} error         The stream error.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  streamError (error, request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      reply.log.info({ res: reply }, 'stream closed prematurely')
    } else {
      reply.log.warn({ err: error }, 'response terminated with an error with headers already sent')
    }
  }

  /**
   * Logs a "route not found" message at `info` level.
   * Used by the default 404 handler.
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  routeNotFound (request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    const { url, method } = request.raw
    request.log.info(`Route ${method}:${url} not found`)
  }

  /**
   * Logs a warning when writeHead fails during error handling.
   *
   * @param {Error} error         The error thrown by writeHead.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  writeHeadError (error, request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    reply.log.warn(
      { req: request, res: reply, err: error },
      error?.message
    )
  }

  /**
   * Logs an error when the serializer for a given status code fails.
   *
   * @param {Error} error         The serialization error.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} metadata     Extra contextual data.
   * @param {number} metadata.statusCode The status code that triggered the serializer.
   */
  serializerError (error, request, reply, metadata) {
    if (this.isLogDisabled(request)) { return }

    reply.log.error({ err: error, statusCode: metadata.statusCode }, 'The serializer for the given status code failed')
  }

  /**
   * Logs a 503 Service Unavailable when the server is closing.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {import('../fastify').FastifyBaseLogger} logger
   * @param {import('../fastify').FastifyInstance} server
   */
  serviceUnavailable (logger, server) {
    logger.info({ res: { statusCode: 503 } }, 'request aborted - refusing to accept new requests as server is closing')
  }

  /**
   * Logs an error thrown by an `onRequestAbort` hook.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The error thrown by the hook.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  onRequestAbortError (error, request, reply, metadata) {
    reply.log.error({ err: error }, 'onRequestAborted hook failed')
  }

  /**
   * Logs a warning when `reply.send()` is called on a reply already sent.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         A `FST_ERR_REP_ALREADY_SENT` error.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  replyAlreadySent (error, request, reply, metadata) {
    reply.log.warn({ err: error })
  }

  /**
   * Logs a warning when `writeHead` fails because headers were already sent,
   * usually caused by a missing `return reply` in an async handler.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The `ERR_HTTP_HEADERS_SENT` error thrown by writeHead.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  // eslint-disable-next-line n/handle-callback-err -- the default line does not include the error
  headersAlreadySent (error, request, reply, metadata) {
    reply.log.warn(`Reply was already sent, did you forget to "return reply" in the "${request.raw.url}" (${request.raw.method}) route?`)
  }

  /**
   * Logs a warning when the response stream errors while awaiting `reply.then()`
   * and no rejection callback was provided.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The response stream error.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  // eslint-disable-next-line n/handle-callback-err -- the default line does not include the error
  replyThenRejection (error, request, reply, metadata) {
    reply.log.warn('unhandled rejection on reply.then')
  }

  /**
   * Logs a warning when a stream payload is sent after `res.writeHead()`
   * was already called, so Fastify can no longer set the reply headers.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  streamHeadersAlreadySent (request, reply, metadata) {
    reply.log.warn('response will send, but you shouldn\'t use res.writeHead in stream mode')
  }

  /**
   * Logs a warning when a stream payload has no `destroy`, `close` or `abort`
   * method, so Fastify cannot release it after the response terminates.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  streamPayloadNotClosable (request, reply, metadata) {
    reply.log.warn('stream payload does not end properly')
  }

  /**
   * Logs at `debug` level an error returned by a trailer function.
   * The trailer is skipped; the response is not affected.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The error passed to the trailer callback.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} metadata     Extra contextual data.
   * @param {string} metadata.trailerName The name of the failed trailer.
   */
  trailerError (error, request, reply, metadata) {
    reply.log.debug(error)
  }

  /**
   * Logs a warning when `reply.callNotFound()` is called inside a 404 handler.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  notFoundInNotFoundHandler (request, reply, metadata) {
    reply.log.warn('Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
  }

  /**
   * Logs two warnings when the router fallback 404 handler is reached:
   * a bug report request and the router tree.
   * Always emitted (not gated by `disableRequestLogging`): this points to a
   * Fastify bug and must stay visible.
   *
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} metadata     Extra contextual data.
   * @param {object} metadata.router The find-my-way router; `prettyPrint()` is called only when logged.
   */
  fourOhFourFallback (request, reply, metadata) {
    request.log.warn('the default handler for 404 did not catch this, this is likely a fastify bug, please report it')
    request.log.warn(metadata.router.prettyPrint())
  }

  /**
   * Logs an error when an async handler rejects after the reply was already sent.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The rejection reason.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  promiseRejectedAfterSent (error, request, reply, metadata) {
    reply.log.error({ err: error }, 'Promise errored, but reply.sent = true was set')
  }

  /**
   * Logs an error emitted by a stream payload discarded by a HEAD route.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {Error} error         The stream error.
   * @param {object} request      Fastify request object.
   * @param {object} reply        Fastify reply object.
   * @param {object} [metadata]   Extra contextual data (unused).
   */
  headStreamError (error, request, reply, metadata) {
    reply.log.error({ err: error }, 'Error on Stream found for HEAD route')
  }

  /**
   * Logs an error thrown by an `onListen` hook.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {import('../fastify').FastifyBaseLogger} logger
   * @param {import('../fastify').FastifyInstance} server  The instance whose hook failed.
   * @param {Error} error         The error thrown by the hook.
   */
  onListenHookError (logger, server, error) {
    logger.error(error)
  }

  /**
   * Logs at `trace` level a client error handled by the default `clientErrorHandler`.
   * Not called when a custom `clientErrorHandler` is set.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {import('../fastify').FastifyBaseLogger} logger
   * @param {import('../fastify').FastifyInstance} server
   * @param {Error} error         The `clientError` event error.
   * @param {string} label        One of `timeout`, `header_overflow` or `error`.
   */
  clientError (logger, server, error, label) {
    logger.trace({ err: error }, `client ${label}`)
  }

  /**
   * Logs at `info` level one address the server is listening on.
   * Called once per address.
   * Always emitted (not gated by `disableRequestLogging`).
   *
   * @param {import('../fastify').FastifyBaseLogger} logger
   * @param {import('../fastify').FastifyInstance} server
   * @param {string} address      The listening address (URL or unix socket path).
   * @param {(address: string) => string} listenTextResolver The resolver from the `listen` options.
   */
  serverListening (logger, server, address, listenTextResolver) {
    logger.info(listenTextResolver(address))
  }
}

module.exports = { LogController }
