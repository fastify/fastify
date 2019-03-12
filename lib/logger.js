'use strict'

/**
 * Code imported from `pino-http`
 * Repo: https://github.com/pinojs/pino-http
 * License: MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE)
 */

const abstractLogging = require('abstract-logging')
const pino = require('pino')
const { serializersSym } = pino.symbols
const { isValidLogger } = require('./validation')
const {
  codes: {
    FST_ERR_LOG_INVALID_DESTINATION
  }
} = require('./errors')

function createPinoLogger (opts, stream) {
  stream = stream || opts.stream
  delete opts.stream

  if (stream && opts.file) {
    throw new FST_ERR_LOG_INVALID_DESTINATION()
  } else if (opts.file) {
    // we do not have stream
    stream = pino.destination(opts.file)
    delete opts.file
  }

  var prevLogger = opts.logger
  var prevGenReqId = opts.genReqId
  var logger = null

  if (prevLogger) {
    opts.logger = undefined
    opts.genReqId = undefined
    // we need to tap into pino internals because in v5 it supports
    // adding serializers in child loggers
    if (prevLogger[serializersSym]) {
      opts.serializers = Object.assign({}, opts.serializers, prevLogger[serializersSym])
    }
    logger = prevLogger.child(opts)
    opts.logger = prevLogger
    opts.genReqId = prevGenReqId
  } else {
    logger = pino(opts, stream)
  }

  return logger
}

const serializers = {
  req: function asReqValue (req) {
    return {
      method: req.method,
      url: req.url,
      version: req.headers['accept-version'],
      hostname: req.hostname,
      remoteAddress: req.ip,
      remotePort: req.connection.remotePort
    }
  },
  err: pino.stdSerializers.err,
  res: function asResValue (res) {
    return {
      statusCode: res.statusCode
    }
  }
}

function now () {
  var ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

function createLogger (options) {
  if (isValidLogger(options.logger)) {
    const logger = createPinoLogger({
      logger: options.logger,
      serializers: Object.assign({}, serializers, options.logger.serializers)
    })
    return { logger, hasLogger: true }
  } else if (!options.logger) {
    const logger = Object.create(abstractLogging)
    logger.child = () => logger
    return { logger, hasLogger: false }
  } else {
    options.logger = typeof options.logger === 'object' ? options.logger : {}
    options.logger.level = options.logger.level || 'info'
    options.logger.serializers = Object.assign({}, serializers, options.logger.serializers)
    const logger = createPinoLogger(options.logger)
    return { logger, hasLogger: true }
  }
}

module.exports = {
  createLogger,
  serializers,
  now
}
