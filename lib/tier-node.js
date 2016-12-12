'use strict'

const urlUtil = require('url')
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
  reply.res = res
  reply.handle = handle
  handle.handler(request, reply)
}

function reply (payload) {
  if (payload instanceof Error) {
    if (!reply.res.statusCode) {
      reply.res.statusCode = 500
    }
    reply.res.end()
    return reply
  }

  if (!payload) {
    if (!reply.res.statusCode) {
      reply.res.statusCode = 204
    }
  }

  const str = serialize(reply.handle, payload)
  if (!reply.res.getHeader('Content-Length')) {
    reply.res.setHeader('Content-Length', Buffer.byteLength(str))
  }

  if (!reply.res.getHeader('Content-Type')) {
    reply.res.setHeader('Content-Type', 'application/json')
  }

  if (!reply.res.statusCode) {
    reply.res.statusCode = 200
  }

  reply.res.end(str)
  return reply
}

reply.send = reply

reply.header = function (key, value) {
  reply.res.setHeader(key, value)
  return reply
}

reply.code = function (code) {
  reply.res.statusCode = code
  return reply
}

function Request (params, req, body, query) {
  this.params = params
  this.req = req
  this.body = body
  this.query = query
}

module.exports = build
module.exports._internals = { bodyParsed, routerHandler, Request, handler, reply }
