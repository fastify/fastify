/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runInSeries = require('fastseries')()
const jsonParser = require('body/json')
const validation = require('./validation')
const validateSchema = validation.validate
const Reply = require('./reply')
const Request = require('./request')

function bodyParsed (hooks, handle, params, req, res) {
  function parsed (err, body) {
    if (err) {
      res.statusCode = 422
      setImmediate(wrapResEnd, res)
      return
    }
    handler(hooks, handle, params, req, res, body, null)
  }

  return parsed
}

function routerHandler (node, hooks) {
  return function _routeHandler (params, req, res) {
    const handle = node[req.method]

    if (!handle) {
      res.statusCode = 404
      setImmediate(wrapResEnd, res)
      return
    }

    // Body not required
    if (req.method === 'GET' || req.method === 'DELETE' || req.method === 'HEAD') {
      return handler(hooks, handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Optional body
    if (req.method === 'OPTIONS') {
      if (req.headers['content-type']) {
        if (req.headers['content-type'] === 'application/json') {
          return jsonParser(req, bodyParsed(hooks, handle, params, req, res))
        }
        res.statusCode = 415
        setImmediate(wrapResEnd, res)
        return
      }
      return handler(hooks, handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Body required
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (req.headers['content-type'] && req.headers['content-type'] === 'application/json') {
        return jsonParser(req, bodyParsed(hooks, handle, params, req, res))
      }
      res.statusCode = 415
      setImmediate(wrapResEnd, res)
      return
    }

    res.statusCode = 404
    setImmediate(wrapResEnd, res)
    return
  }
}

function build (url, router, hooks) {
  const node = {}
  router.on(url, routerHandler(node, hooks))

  return node
}

function handler (hooks, handle, params, req, res, body, query) {
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

  runInSeries(
    new State(request, reply, handle),
    _onRequestIterator,
    hooks.onRequest(),
    _runOnRequest
  )
}

function State (request, reply, handle) {
  this.request = request
  this.reply = reply
  this.handle = handle
}

function _onRequestIterator (fn, cb) {
  setImmediate(fn, this.request, this.reply, cb)
}

function _runOnRequest (err) {
  if (err) {
    this.reply.send(err)
    return
  }
  const result = this.handle.handler(this.request, this.reply)
  if (result && typeof result.then === 'function') {
    this.reply.send(result)
  }
}

function wrapResEnd (res, payload) {
  res.end(payload)
  return
}

module.exports = build
module.exports[Symbol.for('internals')] = { bodyParsed, routerHandler, handler }
