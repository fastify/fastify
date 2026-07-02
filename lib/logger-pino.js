'use strict'

/**
 * Code imported from `pino-http`
 * Repo: https://github.com/pinojs/pino-http
 * License: MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE)
 */

const pino = require('pino')
const { serializersSym } = pino.symbols
const {
  FST_ERR_LOG_INVALID_DESTINATION
} = require('./errors')

function createPinoLogger (opts) {
  if (opts.stream && opts.file) {
    throw new FST_ERR_LOG_INVALID_DESTINATION()
  } else if (opts.file) {
    // we do not have stream
    opts.stream = pino.destination(opts.file)
    delete opts.file
  }

  const customAttributeKeys = opts.customAttributeKeys || {}
  const reqKey = customAttributeKeys.req || 'req'
  const resKey = customAttributeKeys.res || 'res'
  const errKey = customAttributeKeys.err || 'err'

  opts.serializers = Object.assign(Object.create(null), serializers, opts.serializers)

  const prevLogger = opts.logger
  const prevGenReqId = opts.genReqId
  let logger = null

  if (prevLogger) {
    opts.logger = undefined
    opts.genReqId = undefined
    if (prevLogger[serializersSym]) {
      opts.serializers = Object.assign(Object.create(null), opts.serializers, prevLogger[serializersSym])
    }
  }

  if (reqKey !== 'req') {
    opts.serializers[reqKey] = opts.serializers[reqKey] || opts.serializers.req
  }
  if (resKey !== 'res') {
    opts.serializers[resKey] = opts.serializers[resKey] || opts.serializers.res
  }
  if (errKey !== 'err') {
    opts.serializers[errKey] = opts.serializers[errKey] || opts.serializers.err
  }

  if (prevLogger) {
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
      host: req.host,
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

module.exports = {
  serializers,
  createPinoLogger
}
