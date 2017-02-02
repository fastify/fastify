'use strict'

const urlUtil = require('url')
const pump = require('pump')
const jsonParser = require('body/json')
const safeStringify = require('fast-safe-stringify')
const validation = require('./validation')
const validateSchema = validation.validate
const serialize = validation.serialize

function bodyParsed (handle, params, req, res) {
  function parsed (err, body) {
    if (err) {
      res.statusCode = 422
      setImmediate(wrapResEnd, res)
      return
    }
    handler(handle, params, req, res, body, null)
  }
  return parsed
}

function routerHandler (node) {
  function handle (params, req, res) {
    const handle = node[req.method]

    if (!handle) {
      res.statusCode = 404
      setImmediate(wrapResEnd, res)
      return
    }

    // Body not required
    if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'HEAD') {
      return handler(handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Optional body
    if (req.method === 'OPTIONS') {
      if (req.headers['content-type']) {
        if (req.headers['content-type'] === 'application/json') {
          return jsonParser(req, bodyParsed(handle, params, req, res))
        }
        res.statusCode = 415
        setImmediate(wrapResEnd, res)
        return
      }
      return handler(handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Body required
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.headers['content-type'] && req.headers['content-type'] === 'application/json') {
        return jsonParser(req, bodyParsed(handle, params, req, res))
      }
      res.statusCode = 415
      setImmediate(wrapResEnd, res)
      return
    }

    res.statusCode = 404
    setImmediate(wrapResEnd, res)
    return
  }
  return handle
}

function build (url, router) {
  const node = {}
  router.on(url, routerHandler(node))

  return node
}

function handler (handle, params, req, res, body, query) {
  if (!handle) {
    res.statusCode = 404
    setImmediate(wrapResEnd, res)
    return
  }

  const valid = validateSchema(handle, params, body, query)
  if (valid !== true) {
    res.statusCode = 400
    setImmediate(wrapResEnd, res, valid)
    return
  }

  const request = new Request(params, req, body, query)
  const reply = new Reply(req, res, handle)
  const handler = handle.handler
  const result = handler(request, reply)
  if (result && typeof result.then === 'function') {
    reply.send(result)
  }
}

function wrapResEnd (res, payload) {
  res.end(payload)
  return
}

function Reply (req, res, handle) {
  this.res = res
  this.handle = handle
  this.req = req
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

  // If user enabled cors globally and did not disable it on this route
  if (this.handle.schema && (this.handle.schema.cors || (this.handle.schema.out && this.handle.schema.out.cors))) {
    // if cors not disabled for this route
    if (this.handle.schema.out && this.handle.schema.out.cors !== false) {
      const cors = this.handle.schema.cors || this.handle.schema.out.cors

      const headers = {
        'Access-Control-Allow-Origin': cors.origin || '*',
        'Access-Control-Allow-Methods': cors.methods || 'POST,GET,PUT,DELETE,OPTIONS,XMODIFY',
        'Access-Control-Allow-Credentials': cors.credentials || 'true',
        'Access-Control-Max-Age': cors.age || '86400',
        'Access-Control-Allow-Headers': cors.headers || 'X-Requested-With,X-HTTP-Method-Override,Content-Type,Accept'
      }

      for (let header in headers) {
        this.res.setHeader(header, headers[header])
      }
    }
  }

  if (payload instanceof Error) {
    if (!this.res.statusCode || this.res.statusCode < 500) {
      this.res.statusCode = 500
    }
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
      reply.req.log.error(err)
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

function Request (params, req, body, query) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
}

module.exports = build
module.exports[Symbol.for('internals')] = { bodyParsed, routerHandler, Request, handler, Reply }
