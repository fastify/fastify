'use strict'

/**
 * Code imported from `pino-http`
 * Repo: https://github.com/pinojs/pino-http
 * License: MIT (https://raw.githubusercontent.com/pinojs/pino-http/master/LICENSE)
 */

const pino = require('pino')

function createLogger (opts, stream) {
  stream = stream || opts.stream
  delete opts.stream

  var prevLogger = opts.logger
  var prevGenReqId = opts.genReqId
  var logger = null

  if (prevLogger) {
    opts.logger = undefined
    opts.genReqId = undefined
    logger = prevLogger.child(opts)
    opts.logger = prevLogger
    opts.genReqId = prevGenReqId
  } else {
    logger = pino(opts, stream)
  }

  return logger
}

function reqIdGenFactory (requestIdHeader) {
  var maxInt = 2147483647
  var nextReqId = 0
  return function genReqId (req) {
    return req.headers[requestIdHeader] || (nextReqId = (nextReqId + 1) & maxInt)
  }
}

const serializers = {
  req: function asReqValue (req) {
    return {
      id: req.id,
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

function onResponseIterator (fn, res, next) {
  return fn(res, next)
}

function now () {
  var ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

function onResponseCallback (err, res) {
  var responseTime = 0

  if (res._startTime) {
    responseTime = now() - res._startTime
  }

  if (err) {
    res.log.error({
      res,
      err,
      responseTime
    }, 'request errored')
    return
  }

  res.log.info({
    res,
    responseTime
  }, 'request completed')
}

module.exports = {
  createLogger,
  reqIdGenFactory,
  serializers,
  now,
  onResponseIterator,
  onResponseCallback
}
