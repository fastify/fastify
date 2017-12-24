/* eslint-disable no-useless-return */

'use strict'

const pump = require('pump')
const validation = require('./validation')
const serialize = validation.serialize
const statusCodes = require('http').STATUS_CODES
const flatstr = require('flatstr')
const FJS = require('fast-json-stringify')

const serializeError = FJS({
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' }
  }
})

function Reply (res, context, request) {
  this.res = res
  this.context = context
  this.sent = false
  this._serializer = null
  this._customError = false
  this._isError = false
  this.request = request
}

Reply.prototype.send = function (payload) {
  if (this.sent) {
    this.res.log.warn(new Error('Reply already sent'))
    return
  }

  this.sent = true

  if (payload === undefined && this._isError === false) {
    this.res.setHeader('Content-Length', '0')
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'text/plain')
    }
    onSendHook(this, '')
    return
  }

  if (payload instanceof Error || this._isError === true) {
    handleError(this, payload, onSendHook)
    return
  }

  if (payload && payload._readableState) {
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'application/octet-stream')
    }
    pump(payload, this.res, pumpCallback(this))
    return this.res
  }

  onSendHook(this, payload)
  return
}

Reply.prototype.header = function (key, value) {
  this.res.setHeader(key, value)
  return this
}

Reply.prototype.headers = function (headers) {
  var keys = Object.keys(headers)
  for (var i = 0; i < keys.length; i++) {
    this.header(keys[i], headers[keys[i]])
  }
  return this
}

Reply.prototype.code = function (code) {
  this.res.statusCode = code
  return this
}

Reply.prototype.serialize = function (payload) {
  return serialize(this.context, payload, this.res.statusCode)
}

Reply.prototype.serializer = function (fn) {
  this._serializer = fn
  return this
}

Reply.prototype.type = function (type) {
  this.res.setHeader('Content-Type', type)
  return this
}

Reply.prototype.redirect = function (code, url) {
  if (typeof code === 'string') {
    url = code
    code = 302
  }

  this.header('Location', url).code(code).send()
}

function pumpCallback (reply) {
  return function _pumpCallback (err) {
    if (err) {
      reply.res.log.error(err)
      onSendHook(reply, '')
    }
  }
}

function onSendHook (reply, payload) {
  if (reply.context.onSend !== null) {
    reply.context.onSend(
      hookIterator.bind(reply),
      payload,
      wrapOnSendEnd.bind(reply)
    )
  } else {
    onSendEnd(reply, payload)
  }
}

function hookIterator (fn, payload, next) {
  return fn(this.request, this, payload, next)
}

function wrapOnSendEnd (err, payload) {
  if (err) {
    handleError(this, err)
  } else {
    onSendEnd(this, payload)
  }
}

function onSendEnd (reply, payload) {
  var contentType = reply.res.getHeader('Content-Type')
  if (payload && payload._readableState) {
    if (!contentType) {
      reply.res.setHeader('Content-Type', 'application/octet-stream')
    }
    pump(payload, reply.res, pumpCallback(reply))
    return reply.res
  }

  if (!contentType && typeof payload === 'string') {
    reply.res.setHeader('Content-Type', 'text/plain')
  } else if (reply._serializer) {
    payload = reply._serializer(payload)
  } else if (!contentType || contentType === 'application/json') {
    reply.res.setHeader('Content-Type', 'application/json')
    payload = serialize(reply.context, payload, reply.res.statusCode)
    flatstr(payload)
  }

  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', '' + Buffer.byteLength(payload))
  }
  reply.sent = true
  reply.res.end(payload)
}

function handleError (reply, error, cb) {
  var statusCode = reply.res.statusCode
  if (error == null) {
    statusCode = statusCode || 500
  } else if (error.status >= 400) {
    statusCode = error.status
  } else if (error.statusCode >= 400) {
    statusCode = error.statusCode
  } else {
    statusCode = statusCode || 500
  }
  if (statusCode < 400) statusCode = 500
  reply.res.statusCode = statusCode

  if (statusCode >= 500) {
    reply.res.log.error({ res: reply.res, err: error }, error && error.message)
  } else if (statusCode >= 400) {
    reply.res.log.info({ res: reply.res, err: error }, error && error.message)
  }

  if (error && error.headers) {
    reply.headers(error.headers)
  }

  var customErrorHandler = reply.context.errorHandler
  if (customErrorHandler && reply._customError === false) {
    reply.sent = false
    reply._isError = false
    reply._customError = true
    var result = customErrorHandler(error, reply)
    if (result && typeof result.then === 'function') {
      result.then(payload => reply.send(payload))
            .catch(err => reply.send(err))
    }
    return
  }

  var payload = {
    error: statusCodes[statusCode + ''],
    message: error ? error.message : '',
    statusCode: statusCode
  }

  if (cb) {
    cb(reply, payload)
    return
  }

  payload = serializeError(payload)
  flatstr(payload)

  reply.res.setHeader('Content-Length', '' + Buffer.byteLength(payload))
  reply.res.setHeader('Content-Type', 'application/json')
  reply.sent = true
  reply.res.end(payload)
}

function buildReply (R) {
  function _Reply (res, context, request) {
    this.res = res
    this.context = context
    this._isError = false
    this._customError = false
    this.sent = false
    this._serializer = null
    this.request = request
  }
  _Reply.prototype = new R()
  return _Reply
}

module.exports = Reply
module.exports.buildReply = buildReply
