/* eslint-disable no-useless-return */

'use strict'

const pump = require('pump')
const xtend = require('xtend')
const validation = require('./validation')
const serialize = validation.serialize
const statusCodes = require('http').STATUS_CODES
const stringify = JSON.stringify
const flatstr = require('flatstr')

function Reply (req, res, store) {
  this.res = res
  this.store = store
  this._req = req
  this.sent = false
  this._serializer = null
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
    setImmediate(wrapReplyEnd, this, '')
    return
  }

  if (payload && payload.isBoom) {
    this._req.log.error(payload)
    this.res.statusCode = payload.output.statusCode

    this.res.setHeader('Content-Type', 'application/json')
    this.headers(payload.output.headers)

    setImmediate(
      wrapReplyEnd,
      this,
      stringify(payload.output.payload)
    )
    return
  }

  if (payload instanceof Error) {
    if (!this.res.statusCode || this.res.statusCode < 400) {
      this.res.statusCode = 500
    }

    this._req.log.error({ res: this.res, err: payload }, payload.message)
    this.res.setHeader('Content-Type', 'application/json')
    setImmediate(
      wrapReplyEnd,
      this,
      stringify(xtend({
        error: statusCodes[this.res.statusCode + ''],
        message: payload.message,
        statusCode: this.res.statusCode
      }, this._extendServerError && this._extendServerError(payload)))
    )
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

  if (!this.res.getHeader('Content-Type') || this.res.getHeader('Content-Type') === 'application/json') {
    this.res.setHeader('Content-Type', 'application/json')

    // Here we are assuming that the custom serializer is a json serializer
    var str = this._serializer ? this._serializer(payload) : serialize(this.store, payload, this.res.statusCode)
    if (typeof str === 'string') {
      flatstr(str)
    }
    setImmediate(wrapReplyEnd, this, str)
    return
  }

  // All the code below must have a 'content-type' setted
  if (this._serializer) {
    setImmediate(wrapReplyEnd, this, this._serializer(payload))
    return
  }

  setImmediate(wrapReplyEnd, this, payload)
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

function wrapPumpCallback (reply) {
  return function pumpCallback (err) {
    if (err) {
      reply._req.log.error(err)
      setImmediate(wrapReplyEnd, reply, '')
    }
  }
}

function wrapReplyEnd (reply, payload) {
  reply.sent = true
  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', Buffer.byteLength(payload))
  }
  reply.res.end(payload)
}

function wrapReplySend (reply, payload) {
  return function send (payload) {
    // reset sent so that we can call it again
    reply.sent = false
    return reply.send(payload)
  }
}

function buildReply (R) {
  function _Reply (req, res, store) {
    this.res = res
    this.store = store
    this._req = req
    this.sent = false
    this._serializer = null
  }
  _Reply.prototype = new R()
  return _Reply
}

module.exports = Reply
module.exports.buildReply = buildReply
