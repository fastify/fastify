/* eslint-disable no-useless-return */

'use strict'

const pump = require('pump')
const validation = require('./validation')
const serialize = validation.serialize
const statusCodes = require('http').STATUS_CODES
const flatstr = require('flatstr')
const fastseries = require('fastseries')
const runHooks = fastseries()

function Reply (req, res, context, request) {
  this.res = res
  this.context = context
  this._req = req
  this.sent = false
  this._serializer = null
  this._errored = false
  this.request = request
}

/**
 * Instead of using directly res.end(), we are using setImmediate(…)
 * This because we have observed that with this technique we are faster at responding to the various requests,
 * since the setImmediate forwards the res.end at the end of the poll phase of libuv in the event loop.
 * So we can gather multiple requests and then handle all the replies in a different moment,
 * causing a general improvement of performances, ~+10%.
 */
Reply.prototype.send = function (payload) {
  if (this.sent) {
    this._req.log.warn(new Error('Reply already sent'))
    return
  }

  this.sent = true

  if (payload === undefined) {
    this.res.setHeader('Content-Length', '0')
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'text/plain')
    }
    setImmediate(handleReplyEnd, this, '')
    return
  }

  if (payload && payload.isBoom) {
    this._req.log.error(payload)
    this.res.statusCode = payload.output.statusCode

    this.res.setHeader('Content-Type', 'application/json')
    this.headers(payload.output.headers)

    setImmediate(
      handleReplyEnd,
      this,
      payload.output.payload
    )
    return
  }

  if (payload instanceof Error) {
    handleError(this, payload, wrapHandleReplyEnd)
    return
  }

  if (payload && typeof payload.then === 'function') {
    return payload.then(wrapReplySend(this)).catch(wrapReplySend(this))
  }

  if (payload && payload._readableState) {
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'application/octet-stream')
    }
    return pump(payload, this.res, wrapPumpCallback(this))
  }

  setImmediate(handleReplyEnd, this, payload)
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

  this.res.writeHead(code, { Location: url })
  this.res.end()
}

function wrapHandleReplyEnd (reply, payload) {
  setImmediate(
    handleReplyEnd,
    reply,
    payload
  )
}

function wrapPumpCallback (reply) {
  return function pumpCallback (err) {
    if (err) {
      reply._req.log.error(err)
      setImmediate(handleReplyEnd, reply, '')
    }
  }
}

function handleReplyEnd (reply, payload) {
  if (reply.context.onSend.length === 0) {
    return onSendEnd(reply, payload)
  }
  setImmediate(
    runHooks,
    new State(reply, payload),
    hookIterator,
    reply.context.onSend,
    wrapOnSendEnd
  )
}

function wrapOnSendEnd (err) {
  if (err) {
    handleError(this.reply, err, onSendEnd)
    return
  }
  onSendEnd(this.reply, this.payload)
}

function onSendEnd (reply, payload) {
  if (!reply.res.getHeader('Content-Type') || reply.res.getHeader('Content-Type') === 'application/json') {
    reply.res.setHeader('Content-Type', 'application/json')
    // Here we are assuming that the custom serializer is a json serializer
    payload = reply._serializer ? reply._serializer(payload) : serialize(reply.context, payload, reply.res.statusCode)
    flatstr(payload)
  } else if (reply._serializer) { // All the code below must have a 'content-type' setted
    payload = reply._serializer(payload)
  }

  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', Buffer.byteLength(payload))
  }
  reply.sent = true
  reply.res.end(payload)
}

function wrapReplySend (reply, payload) {
  return function send (payload) {
    // reset sent so that we can call it again
    reply.sent = false
    return reply.send(payload)
  }
}

function handleError (reply, err, cb) {
  if (!reply.res.statusCode || reply.res.statusCode < 400) {
    reply.res.statusCode =
        ('status' in err && err.status >= 400) ? err.status
      : ('statusCode' in err && err.statusCode >= 400) ? err.statusCode
      : 500
  }

  reply._req.log.error({ res: reply.res, err }, err.message)

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
    message: err.message,
    statusCode: reply.res.statusCode
  }, reply._extendServerError && reply._extendServerError(err)))
}

function State (that, payload) {
  this.request = that.request
  this.reply = that
  this.payload = payload
}

function hookIterator (fn, cb) {
  var ret = fn(this.request, this.reply, this.payload, cb)
  if (ret && typeof ret.then === 'function') {
    ret.then(cb).catch(cb)
  }
}

function buildReply (R) {
  function _Reply (req, res, context, request) {
    this.res = res
    this.context = context
    this._req = req
    this.sent = false
    this._serializer = null
    this.request = request
  }
  _Reply.prototype = new R()
  return _Reply
}

module.exports = Reply
module.exports.buildReply = buildReply
