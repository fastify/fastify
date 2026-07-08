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
   * @param {Error | null} error  Error that occurred during the response, if any.
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
}

module.exports = { LogController }
