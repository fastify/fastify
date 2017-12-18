/* eslint-disable no-useless-return */

'use strict'

const pump = require('pump')
const validation = require('./validation')
const serialize = validation.serialize
const statusCodes = require('http').STATUS_CODES
const flatstr = require('flatstr')

const isError = Symbol('is-error')

function Reply (res, context, request) {
  this.res = res
  this.context = context
  this[isError] = false
  this.sent = false
  this._serializer = null
  this._errored = false
  this.request = request
}

Reply.prototype.send = function (payload) {
  if (this.sent) {
    this.res.log.warn(new Error('Reply already sent'))
    return
  }

  this.sent = true

  var _isError = this[isError]

  if (payload === undefined && _isError !== true) {
    this.res.setHeader('Content-Length', '0')
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'text/plain')
    }
    handleReplyEnd(this, '')
    return
  }

  if (payload && payload.isBoom) {
    this.res.log.error(payload)
    this.res.statusCode = payload.output.statusCode

    this.res.setHeader('Content-Type', 'application/json')
    this.headers(payload.output.headers)

    handleReplyEnd(
      this,
      payload.output.payload
    )
    return
  }

  if (payload instanceof Error || _isError === true) {
    handleError(this, payload, wrapHandleReplyEnd)
    return
  }

  if (payload && payload._readableState) {
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'application/octet-stream')
    }
    pump(payload, this.res, wrapPumpCallback(this))
    return this.res
  }

  handleReplyEnd(this, payload)
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

function wrapHandleReplyEnd (reply, payload) {
  handleReplyEnd(
    reply,
    payload
  )
}

function wrapPumpCallback (reply) {
  return function pumpCallback (err) {
    if (err) {
      reply.res.log.error(err)
      handleReplyEnd(reply, '')
    }
  }
}

function handleReplyEnd (reply, payload) {
  if (reply.context.onSend !== null) {
    reply.context.onSend(
      hookIterator.bind(reply),
      payload,
      wrapOnSendEnd.bind(reply)
    )
  } else {
    wrapOnSendEnd.call(reply, null, payload)
  }
}

function hookIterator (fn, payload, next) {
  return fn(this.request, this, payload, next)
}

function wrapOnSendEnd (err, payload) {
  if (err) {
    handleError(this, err, onSendEnd)
    return
  }
  onSendEnd(this, payload)
}

function onSendEnd (reply, payload) {
  var contentType = reply.res.getHeader('Content-Type')
  if (payload && payload._readableState) {
    if (!contentType) {
      reply.res.setHeader('Content-Type', 'application/octet-stream')
    }
    pump(payload, reply.res, wrapPumpCallback(reply))
    return reply.res
  }

  if (!contentType && typeof payload === 'string') {
    reply.res.setHeader('Content-Type', 'text/plain')
  } else if (!contentType || contentType === 'application/json') {
    reply.res.setHeader('Content-Type', 'application/json')
    // Here we are assuming that the custom serializer is a json serializer
    payload = reply._serializer ? reply._serializer(payload) : serialize(reply.context, payload, reply.res.statusCode)
    flatstr(payload)
  } else if (reply._serializer) { // All the code below must have a 'content-type' setted
    payload = reply._serializer(payload)
  }

  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', '' + Buffer.byteLength(payload))
  }
  reply.sent = true
  reply.res.end(payload)
}

function handleError (reply, err, cb) {
  if (!reply.res.statusCode || reply.res.statusCode < 400) {
    reply.res.statusCode =
        (err === null || err === undefined) ? 500
      : (err.status >= 400) ? err.status
      : (err.statusCode >= 400) ? err.statusCode
      : 500
  }

  if (reply.res.statusCode >= 500) {
    reply.res.log.error({ res: reply.res, err }, err && err.message)
  } else if (reply.res.statusCode >= 400) {
    reply.res.log.info({ res: reply.res, err }, err && err.message)
  }

  var errorHandler = reply.context.errorHandler

  if (errorHandler && !reply._errored) {
    reply.sent = false
    reply._errored = true
    errorHandler(err, reply)
    return
  }

  reply.res.setHeader('Content-Type', 'application/json')

  cb(reply, Object.assign({
    error: statusCodes[reply.res.statusCode + ''],
    message: (err || '') && err.message,
    statusCode: reply.res.statusCode
  }, reply._extendServerError && reply._extendServerError(err)))
}

function buildReply (R) {
  function _Reply (res, context, request) {
    this.res = res
    this.context = context
    this[isError] = false
    this.sent = false
    this._serializer = null
    this.request = request
  }
  _Reply.prototype = new R()
  return _Reply
}

module.exports = Reply
module.exports.buildReply = buildReply
module.exports.isError = isError
