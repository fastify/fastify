'use strict'

/**
 * Code imported from `pino-http`
 * Repo: https://github.com/pinojs/pino-http
 * License: MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE)
 */

const nullLogger = require('abstract-logging')
const pino = require('pino')
const { serializersSym } = pino.symbols
const {
  FST_ERR_LOG_INVALID_DESTINATION,
  FST_ERR_LOG_INVALID_LOGGER
} = require('./errors')

function createPinoLogger (opts) {
  if (opts.stream && opts.file) {
    throw new FST_ERR_LOG_INVALID_DESTINATION()
  } else if (opts.file) {
    // we do not have stream
    opts.stream = pino.destination(opts.file)
    delete opts.file
  }

  const prevLogger = opts.logger
  const prevGenReqId = opts.genReqId
  let logger = null

  if (prevLogger) {
    opts.logger = undefined
    opts.genReqId = undefined
    // we need to tap into pino internals because in v5 it supports
    // adding serializers in child loggers
    if (prevLogger[serializersSym]) {
      opts.serializers = Object.assign({}, opts.serializers, prevLogger[serializersSym])
    }
    logger = prevLogger.child({}, opts)
    opts.logger = prevLogger
    opts.genReqId = prevGenReqId
  } else {
    logger = pino(opts, opts.stream)
  }

  return logger
}

const serializers = {
  req: function asReqValue (req) {
    return {
      method: req.method,
      url: req.url,
      version: req.headers && req.headers['accept-version'],
      hostname: req.hostname,
      remoteAddress: req.ip,
      remotePort: req.socket ? req.socket.remotePort : undefined
    }
  },
  err: pino.stdSerializers.err,
  res: function asResValue (reply) {
    return {
      statusCode: reply.statusCode
    }
  }
}

function now () {
  const ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

function createLogger (options) {
  if (!options.logger) {
    const logger = nullLogger
    logger.child = () => logger
    return { logger, hasLogger: false }
  }

  if (validateLogger(options.logger)) {
    const logger = createPinoLogger({
      logger: options.logger,
      serializers: Object.assign({}, serializers, options.logger.serializers)
    })
    return { logger, hasLogger: true }
  }

  const localLoggerOptions = {}
  if (Object.prototype.toString.call(options.logger) === '[object Object]') {
    Reflect.ownKeys(options.logger).forEach(prop => {
      Object.defineProperty(localLoggerOptions, prop, {
        value: options.logger[prop],
        writable: true,
        enumerable: true,
        configurable: true
      })
    })
  }
  localLoggerOptions.level = localLoggerOptions.level || 'info'
  localLoggerOptions.serializers = Object.assign({}, serializers, localLoggerOptions.serializers)
  options.logger = localLoggerOptions
  const logger = createPinoLogger(options.logger)
  return { logger, hasLogger: true }
}

/**
 * Determines if a provided logger object meets the requirements
 * of a Fastify compatible logger.
 *
 * @param {object} logger Object to validate.
 *
 * @returns {boolean} `true` when the logger meets the requirements.
 *
 * @throws {FST_ERR_LOG_INVALID_LOGGER} When the logger object is
 * missing required methods.
 */
function validateLogger (logger) {
  const methods = ['info', 'error', 'debug', 'fatal', 'warn', 'trace', 'child']
  const missingMethods = methods.filter(method => !logger[method] || typeof logger[method] !== 'function')

  if (!missingMethods.length) {
    return true
  } else if (missingMethods.length === methods.length) {
    return false
  } else {
    throw FST_ERR_LOG_INVALID_LOGGER(missingMethods.join(','))
  }
}

module.exports = {
  createLogger,
  serializers,
  now
}
