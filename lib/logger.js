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

function reqIdGenFactory () {
  var maxInt = 2147483647
  var nextReqId = 0
  return function genReqId (req) {
    return req.headers['request-id'] || (nextReqId = (nextReqId + 1) & maxInt)
  }
}

const serializers = {
  req: function asReqValue (req) {
    return {
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.connection.remoteAddress,
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

function OnResponseState (err, res) {
  this.err = err
  this.res = res
}

function onResponseIterator (fn, cb) {
  var ret = fn(this.res, cb)
  if (ret && typeof ret.then === 'function') {
    ret.then(cb).catch(cb)
  }
}

function now () {
  var ts = process.hrtime()
  return (ts[0] * 1e3) + (ts[1] / 1e6)
}

function onResponseCallback (err, res) {
  var responseTime = now() - res._startTime

  if (err) {
    res.logger.error({
      res,
      err,
      responseTime
    }, 'request errored')
    return
  }

  res.logger.info({
    res,
    responseTime
  }, 'request completed')
}

module.exports = {
  createLogger,
  reqIdGenFactory,
  serializers,
  now,
  OnResponseState,
  onResponseIterator,
  onResponseCallback
}
