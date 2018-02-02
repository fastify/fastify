/* eslint-disable no-useless-return */

'use strict'

const eos = require('end-of-stream')
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

  if (payload instanceof Error || this._isError === true) {
    handleError(this, payload, onSendHook)
    return
  }

  if (payload === undefined) {
    onSendHook(this, payload)
    return
  }

  const contentType = this.res.getHeader('Content-Type')
  const contentTypeNotSet = contentType === undefined

  if (payload !== null) {
    if (Buffer.isBuffer(payload) || typeof payload.pipe === 'function') {
      if (contentTypeNotSet) {
        this.res.setHeader('Content-Type', 'application/octet-stream')
      }
      onSendHook(this, payload)
      return
    }

    if (contentTypeNotSet && typeof payload === 'string') {
      this.res.setHeader('Content-Type', 'text/plain')
      onSendHook(this, payload)
      return
    }
  }

  if (this._serializer) {
    payload = this._serializer(payload)
  } else if (contentTypeNotSet || contentType === 'application/json') {
    this.res.setHeader('Content-Type', 'application/json')
    payload = serialize(this.context, payload, this.res.statusCode)
    flatstr(payload)
  }

  onSendHook(this, payload)
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
  if (payload === undefined || payload === null) {
    reply.sent = true
    reply.res.end()
    return
  }

  if (typeof payload.pipe === 'function') {
    sendStream(payload, reply.res, reply)
    return
  }

  if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
    throw new TypeError(`Attempted to send payload of invalid type '${typeof payload}'. Expected a string or Buffer.`)
  }

  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', '' + Buffer.byteLength(payload))
  }

  reply.sent = true
  reply.res.end(payload)
}

function sendStream (payload, res, reply) {
  var sourceOpen = true

  eos(payload, { readable: true, writable: false }, function (err) {
    sourceOpen = false
    if (err) {
      if (res.headersSent) {
        res.log.error(err, 'response terminated with an error with headers already sent')
        res.destroy()
      } else {
        handleError(reply, err)
      }
    }
    // there is nothing to do if there is not an error
  })

  eos(res, function (err) {
    if (err) {
      if (res.headersSent) {
        res.log.error(err, 'response terminated with an error with headers already sent')
      }
      if (sourceOpen) {
        if (payload.destroy) {
          payload.destroy()
        } else if (typeof payload.close === 'function') {
          payload.close(noop)
        } else if (typeof payload.abort === 'function') {
          payload.abort()
        }
      }
    }
  })

  payload.pipe(res)
}

function handleError (reply, error, cb) {
  var statusCode = reply.res.statusCode
  if (error == null) {
    statusCode = statusCode || 500
  } else if (error.status >= 400) {
    if (error.status === 404) {
      notFound(reply)
      return
    }
    statusCode = error.status
  } else if (error.statusCode >= 400) {
    if (error.statusCode === 404) {
      notFound(reply)
      return
    }
    statusCode = error.statusCode
  } else {
    statusCode = statusCode || 500
  }

  if (statusCode < 400) statusCode = 500
  reply.res.statusCode = statusCode

  if (statusCode >= 500) {
    reply.res.log.error({ req: reply.request.raw, res: reply.res, err: error }, error && error.message)
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
    var result = customErrorHandler(error, reply.request, reply)
    if (result && typeof result.then === 'function') {
      result.then(payload => reply.send(payload))
            .catch(err => reply.send(err))
    }
    return
  }

  var payload = serializeError({
    error: statusCodes[statusCode + ''],
    message: error ? error.message : '',
    statusCode: statusCode
  })
  flatstr(payload)
  reply.res.setHeader('Content-Type', 'application/json')

  if (cb) {
    cb(reply, payload)
    return
  }

  reply.res.setHeader('Content-Length', '' + Buffer.byteLength(payload))
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

function notFound (reply) {
  reply.sent = false
  reply._isError = false

  if (reply.context._fastify === null) {
    reply.res.log.warn('Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
    reply.code(404).send('404 Not Found')
    return
  }

  reply.context = reply.context._fastify._404Context
  reply.context.handler(reply.request, reply)
}

function noop () {}

module.exports = Reply
module.exports.buildReply = buildReply
