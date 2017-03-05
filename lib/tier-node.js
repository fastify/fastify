/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
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
  return function _routeHanlder (params, req, res) {
    // postRouting|preParsing hook
    runHooks(
      new State(req, res, null, null, hooks, null, params, null, null, node),
      hookIterator,
      hooks.preParsing(),
      routeHandlerCallback
    )
  }
}

function routeHandlerCallback (err) {
  if (err) {
    const reply = new Reply(this.req, this.res, null)
    reply.send(err)
    return
  }

  const req = this.req
  const res = this.res
  const params = this.params
  const node = this.node
  const hooks = this.hooks

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

  runHooks(
    new State(req, res, null, null, hooks, handle, params, body, query, null),
    hookIterator,
    hooks.preValidation(),
    dataValidation
  )
}

function dataValidation (err) {
  if (err) {
    const reply = new Reply(this.req, this.res, null)
    reply.send(err)
    return
  }

  const valid = validateSchema(this.handle, this.params, this.body, this.query)
  if (valid !== true) {
    this.res.statusCode = 400
    setImmediate(wrapResEnd, this.res, valid)
    return
  }

  const request = new Request(this.params, this.req, this.body, this.query)
  const reply = new Reply(this.req, this.res, this.handle)

  runHooks(
    new State(null, null, request, reply, null, this.handle, null, null, null, null),
    hookIteratorRR,
    this.hooks.preHandler(),
    preHandlerCallback
  )
}

function State (req, res, request, reply, hooks, handle, params, body, query, node) {
  this.req = req
  this.res = res
  this.request = request
  this.reply = reply
  this.hooks = hooks
  this.handle = handle
  this.params = params
  this.body = body
  this.query = query
  this.node = node
}

function hookIterator (fn, cb) {
  fn(this.req, this.res, cb)
}

function hookIteratorRR (fn, cb) {
  fn(this.request, this.reply, cb)
}

function preHandlerCallback (err) {
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
