/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
const jsonParser = require('body/json')
const validation = require('./validation')
const validateSchema = validation.validate

function bodyParsed (hooks, handle, params, req, res) {
  function parsed (err, body) {
    if (err) {
      res.statusCode = 422
      setImmediate(wrapResEnd, res)
      return
    }
    handler(hooks, handle, params, req, res, body, urlUtil.parse(req.url, true).query)
  }

  return parsed
}

function routerHandler (node, hooks) {
  return function _routeHanlder (params, req, res) {
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
        if (req.headers['content-type'].indexOf('application/json') > -1) {
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
      if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') > -1) {
        return jsonParser(req, bodyParsed(hooks, handle, params, req, res))
      } else if (req.headers['content-type'] && req.headers['content-type'].indexOf('multipart/form-data') > -1) {
        return handler(hooks, handle, params, req, res, null, urlUtil.parse(req.url, true).query)
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

  const request = new handle.Request(params, req, body, query, req.log)
  const reply = new handle.Reply(req, res, handle)

  // preHandler hook
  runHooks(
    new State(request, reply, handle),
    hookIterator,
    hooks.preHandler(),
    preHandlerCallback
  )
}

function State (request, reply, handle) {
  this.request = request
  this.reply = reply
  this.handle = handle
}

function hookIterator (fn, cb) {
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
