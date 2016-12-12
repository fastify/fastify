'use strict'

const urlUtil = require('url')
const pump = require('pump')
const jsonParser = require('body/json')
const validation = require('./validation')
const validateSchema = validation.validate
const serialize = validation.serialize

function bodyParsed (handle, params, req, res) {
  function parsed (err, body) {
    if (err) {
      res.statusCode = 422
      res.end()
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
      res.end()
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
        res.end()
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
      res.end()
      return
    }

    res.statusCode = 404
    res.end()
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
    res.end()
    return
  }

  const valid = validateSchema(handle, params, body, query)
  if (valid !== true) {
    res.statusCode = 400
    res.end(valid)
    return
  }

  const request = new Request(params, req, body, query)
  handle.handler(request, new Reply(res, handle))
}

function Reply (res, handle) {
  this.res = res
  this.handle = handle
}

Reply.prototype.send = function (payload) {
  if (payload instanceof Error) {
    if (!this.res.statusCode) {
      this.res.statusCode = 500
    }
    return this.res.end()
  }

  if (!payload) {
    if (!this.res.statusCode) {
      this.res.statusCode = 204
    }
  }

  if (payload && payload._readableState) {
    if (!this.res.getHeader('Content-Type')) {
      this.res.setHeader('Content-Type', 'application/octet-stream')
    }
    return pump(payload, this.res, err => {
      if (err) this.res.end()
    })
  }

  if (!this.res.getHeader('Content-Type') || this.res.getHeader('Content-Type') === 'application/json') {
    this.res.setHeader('Content-Type', 'application/json')

    const str = serialize(this.handle, payload)
    if (!this.res.getHeader('Content-Length')) {
      this.res.setHeader('Content-Length', Buffer.byteLength(str))
    }
    return this.res.end(str)
  }

  this.res.end(payload)
}

Reply.prototype.header = function (key, value) {
  this.res.setHeader(key, value)
  return this
}

Reply.prototype.code = function (code) {
  this.res.statusCode = code
  return this
}

function Request (params, req, body, query) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
}

module.exports = build
module.exports[Symbol.for('internals')] = { bodyParsed, routerHandler, Request, handler, Reply }
