/* eslint-disable no-useless-return */

'use strict'

const eos = require('end-of-stream')
const validation = require('./validation')
const serialize = validation.serialize
const statusCodes = require('http').STATUS_CODES
const flatstr = require('flatstr')
const FJS = require('fast-json-stringify')
const runHooks = require('./hookRunner').onSendHookRunner
const wrapThenable = require('./wrapThenable')

const serializeError = FJS({
  type: 'object',
  properties: {
    statusCode: { type: 'number' },
    error: { type: 'string' },
    message: { type: 'string' }
  }
})

const CONTENT_TYPE = {
  JSON: 'application/json; charset=utf-8',
  PLAIN: 'text/plain; charset=utf-8',
  OCTET: 'application/octet-stream'
}

var getHeader

function Reply (res, context, request) {
  this.res = res
  this.context = context
  this.sent = false
  this._serializer = null
  this._customError = false
  this._isError = false
  this.request = request
  this._headers = {}
  this._hasStatusCode = false
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

  var contentType = getHeader(this, 'content-type')
  var hasContentType = contentType !== undefined

  if (payload !== null) {
    if (Buffer.isBuffer(payload) || typeof payload.pipe === 'function') {
      if (hasContentType === false) {
        this._headers['content-type'] = CONTENT_TYPE.OCTET
      }
      onSendHook(this, payload)
      return
    }

    if (hasContentType === false && typeof payload === 'string') {
      this._headers['content-type'] = CONTENT_TYPE.PLAIN
      onSendHook(this, payload)
      return
    }
  }

  if (this._serializer) {
    payload = this._serializer(payload)
  } else if (hasContentType === false || contentType.indexOf('application/json') > -1) {
    if (hasContentType === false || contentType.indexOf('charset') === -1) {
      this._headers['content-type'] = CONTENT_TYPE.JSON
    }
    payload = serialize(this.context, payload, this.res.statusCode)
    flatstr(payload)
  }

  onSendHook(this, payload)
}

Reply.prototype.getHeader = function (key) {
  return getHeader(this, key)
}

Reply.prototype.hasHeader = function (key) {
  return this._headers[key.toLowerCase()] !== undefined
}

Reply.prototype.removeHeader = function (key) {
  // Node.js does not like headers with keys set to undefined,
  // so we have to delete the key.
  delete this._headers[key.toLowerCase()]
  return this
}

Reply.prototype.header = function (key, value) {
  var _key = key.toLowerCase()

  // default the value to ''
  value = value === undefined ? '' : value

  if (this._headers[_key] && _key === 'set-cookie') {
    // https://tools.ietf.org/html/rfc7230#section-3.2.2
    this._headers[_key] = [this._headers[_key]].concat(value)
  } else {
    this._headers[_key] = value
  }
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
  this._hasStatusCode = true
  return this
}

Reply.prototype.status = Reply.prototype.code

Reply.prototype.serialize = function (payload) {
  return serialize(this.context, payload, this.res.statusCode)
}

Reply.prototype.serializer = function (fn) {
  this._serializer = fn
  return this
}

Reply.prototype.type = function (type) {
  this._headers['content-type'] = type
  return this
}

Reply.prototype.redirect = function (code, url) {
  if (typeof code === 'string') {
    url = code
    code = this._hasStatusCode ? this.res.statusCode : 302
  }

  this.header('location', url).code(code).send()
}

function onSendHook (reply, payload) {
  if (reply.context.onSend !== null) {
    runHooks(
      reply.context.onSend,
      reply,
      payload,
      wrapOnSendEnd
    )
  } else {
    onSendEnd(reply, payload)
  }
}

function wrapOnSendEnd (err, reply, payload) {
  if (err) {
    handleError(reply, err)
  } else {
    onSendEnd(reply, payload)
  }
}

function onSendEnd (reply, payload) {
  var res = reply.res
  var statusCode = res.statusCode

  if (payload === undefined || payload === null) {
    reply.sent = true

    // according to https://tools.ietf.org/html/rfc7230#section-3.3.2
    // we cannot send a content-length for 304 and 204, and all status code
    // < 200.
    if (statusCode >= 200 && statusCode !== 204 && statusCode !== 304) {
      reply._headers['content-length'] = '0'
    }

    res.writeHead(statusCode, reply._headers)
    // avoid ArgumentsAdaptorTrampoline from V8
    res.end(null, null, null)
    return
  }

  if (typeof payload.pipe === 'function') {
    sendStream(payload, res, reply)
    return
  }

  if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
    throw new TypeError(`Attempted to send payload of invalid type '${typeof payload}'. Expected a string or Buffer.`)
  }

  if (!reply._headers['content-length']) {
    reply._headers['content-length'] = '' + Buffer.byteLength(payload)
  }

  reply.sent = true

  res.writeHead(statusCode, reply._headers)

  // avoid ArgumentsAdaptorTrampoline from V8
  res.end(payload, null, null)
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

  // streams will error asynchronously, and we want to handle that error
  // appropriately, e.g. a 404 for a missing file. So we cannot use
  // writeHead, and we need to resort to setHeader, which will trigger
  // a writeHead when there is data to send.
  if (!res.headersSent) {
    for (var key in reply._headers) {
      res.setHeader(key, reply._headers[key])
    }
  } else {
    res.log.warn('response will send, but you shouldn\'t use res.writeHead in stream mode')
  }
  payload.pipe(res)
}

function handleError (reply, error, cb) {
  var res = reply.res
  var statusCode = res.statusCode
  statusCode = (statusCode >= 400) ? statusCode : 500
  // treat undefined and null as same
  if (error != null) {
    if (error.headers !== undefined) {
      reply.headers(error.headers)
    }
    if (error.status >= 400) {
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
    }
  }

  res.statusCode = statusCode

  if (statusCode >= 500) {
    res.log.error({ req: reply.request.raw, res: res, err: error }, error && error.message)
  } else if (statusCode >= 400) {
    res.log.info({ res: res, err: error }, error && error.message)
  }

  var customErrorHandler = reply.context.errorHandler
  if (customErrorHandler && reply._customError === false) {
    reply.sent = false
    reply._isError = false
    reply._customError = true
    var result = customErrorHandler(error, reply.request, reply)
    if (result && typeof result.then === 'function') {
      wrapThenable(result, reply)
    }
    return
  }

  var payload = serializeError({
    error: statusCodes[statusCode + ''],
    message: error ? error.message : '',
    statusCode: statusCode
  })
  flatstr(payload)
  reply._headers['content-type'] = CONTENT_TYPE.JSON

  if (cb) {
    cb(reply, payload)
    return
  }

  reply._headers['content-length'] = '' + Buffer.byteLength(payload)
  reply.sent = true
  res.writeHead(res.statusCode, reply._headers)
  res.end(payload)
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
    this._headers = {}
  }
  _Reply.prototype = new R()
  return _Reply
}

function notFound (reply) {
  reply.sent = false
  reply._isError = false

  if (reply.context._404Context === null) {
    reply.res.log.warn('Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
    reply.code(404).send('404 Not Found')
    return
  }

  reply.context = reply.context._404Context
  reply.context.handler(reply.request, reply)
}

function noop () {}

function getHeaderProper (reply, key) {
  key = key.toLowerCase()
  var res = reply.res
  var value = reply._headers[key]
  if (value === undefined && res.hasHeader(key)) {
    value = res.getHeader(key)
  }
  return value
}

function getHeaderFallback (reply, key) {
  key = key.toLowerCase()
  var res = reply.res
  var value = reply._headers[key]
  if (value === undefined) {
    value = res.getHeader(key)
  }
  return value
}

// ponyfill for hasHeader. It has been intoroduced into Node 7.7,
// so it's ok to use it in 8+
{
  const v = process.version.match(/v(\d+)/)[1]
  if (Number(v) > 7) {
    getHeader = getHeaderProper
  } else {
    getHeader = getHeaderFallback
  }
}

module.exports = Reply
module.exports.buildReply = buildReply
