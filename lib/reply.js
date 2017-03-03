'use strict'

const pump = require('pump')
const safeStringify = require('fast-safe-stringify')
const validation = require('./validation')
const serialize = validation.serialize

function Reply (req, res, handle) {
  this.res = res
  this.handle = handle
  this._req = req
  this.sent = false
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
    throw new Error('Reply already sent')
  }

  if (payload instanceof Error) {
    if (!this.res.statusCode || this.res.statusCode < 500) {
      this.res.statusCode = 500
    }

    this._req.log.error(payload)
    setImmediate(wrapReplyEnd, this, safeStringify(payload))
    return
  }

  if (payload && typeof payload.then === 'function') {
    return payload.then(wrapReplySend(this)).catch(wrapReplySend(this))
  }

  if (!payload && !this.res.statusCode) {
    this.res.statusCode = 204
  }

  if (payload && payload._readableState) {
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'application/octet-stream')
    }
    return pump(payload, this.res, wrapPumpCallback(this))
  }

  if (!this.res.getHeader('Content-Type') || this.res.getHeader('Content-Type') === 'application/json') {
    this.res.setHeader('Content-Type', 'application/json')

    const str = serialize(this.handle, payload)
    if (!this.res.getHeader('Content-Length')) {
      this.res.setHeader('Content-Length', Buffer.byteLength(str))
    }
    setImmediate(wrapReplyEnd, this, str)
    return
  }

  setImmediate(wrapReplyEnd, this, payload)
  return
}

Reply.prototype.header = function (key, value) {
  this.res.setHeader(key, value)
  return this
}

Reply.prototype.code = function (code) {
  this.res.statusCode = code
  return this
}

function wrapPumpCallback (reply) {
  return function pumpCallback (err) {
    if (err) {
      reply._req.log.error(err)
      setImmediate(wrapReplyEnd, reply)
    }
  }
}

function wrapReplyEnd (reply, payload) {
  reply.sent = true
  reply.res.end(payload)
}

function wrapReplySend (reply, payload) {
  return function send (payload) {
    return reply.send(payload)
  }
}

module.exports = Reply
