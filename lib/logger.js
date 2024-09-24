'use strict'

/**
 * Code imported from `pino-http`
 * Repo: https://github.com/pinojs/pino-http
 * License: MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE)
 */

const nullLogger = require('abstract-logging')
const pino = require('pino')
const { serializersSym } = pino.symbols
const { FST_ERR_LOG_INVALID_DESTINATION } = require('./errors')

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

  const prevLogger = opts.loggerInstance
  const prevGenReqId = opts.genReqId
  let loggerInstance = null

  if (prevLogger) {
    opts.loggerInstance = undefined
    opts.genReqId = undefined
    // we need to tap into pino internals because in v5 it supports
    // adding serializers in child loggers
    if (prevLogger[serializersSym]) {
      opts.serializers = Object.assign({}, opts.serializers, prevLogger[serializersSym])
    }
    loggerInstance = prevLogger.child({}, opts)
    opts.loggerInstance = prevLogger
    opts.genReqId = prevGenReqId
  } else {
    loggerInstance = pino(opts, stream)
  }

  return loggerInstance;
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
  if (isValidLogger(options.loggerInstance)) {
    const loggerInstance = createPinoLogger({
      loggerInstance: options.loggerInstance,
      serializers: Object.assign({}, serializers, options.loggerInstance.serializers)
    })
    return { loggerInstance, hasLogger: true };
  } else if (!options.loggerInstance) {
    const loggerInstance = nullLogger
    loggerInstance.child = () => loggerInstance
    return { loggerInstance, hasLogger: false };
  } else {
    const localLoggerOptions = {}
    if (Object.prototype.toString.call(options.loggerInstance) === '[object Object]') {
      Reflect.ownKeys(options.loggerInstance).forEach(prop => {
        Object.defineProperty(localLoggerOptions, prop, {
          value: options.loggerInstance[prop],
          writable: true,
          enumerable: true,
          configurable: true
        })
      })
    }
    localLoggerOptions.level = localLoggerOptions.level || 'info'
    localLoggerOptions.serializers = Object.assign({}, serializers, localLoggerOptions.serializers)
    options.loggerInstance = localLoggerOptions
    const loggerInstance = createPinoLogger(options.loggerInstance)
    return { loggerInstance, hasLogger: true };
  }
}

function isValidLogger (loggerInstance) {
  if (!loggerInstance) {
    return false
  }

  let result = true
  const methods = ['info', 'error', 'debug', 'fatal', 'warn', 'trace', 'child']
  for (let i = 0; i < methods.length; i += 1) {
    if (!loggerInstance[methods[i]] || typeof loggerInstance[methods[i]] !== 'function') {
      result = false
      break
    }
  }
  return result
}

module.exports = {
  createLogger,
  serializers,
  now
}
