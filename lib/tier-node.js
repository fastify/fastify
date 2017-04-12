/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
const validation = require('./validation')
const validateSchema = validation.validate

function build (url, router) {
  const node = {}
  router.on(url, routerHandler(node))

  return node
}

function routerHandler (node) {
  return function _routerHandler (params, req, res, method) {
    var handle = node[method]
    if (!handle) {
      res.statusCode = 404
      setImmediate(wrapResEnd, res)
      return
    }

    // Body not required
    if (method === 'GET' || method === 'DELETE' || method === 'HEAD') {
      return handler(handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Optional body
    if (method === 'OPTIONS') {
      if (req.headers['content-type']) {
        // application/json content type
        if (req.headers['content-type'].indexOf('application/json') > -1) {
          return jsonBody(req, res, params, handle)
        // custom parser for a given content type
        } else if (handle.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
          return handle.contentTypeParser.run(req.headers['content-type'], handler, handle, params, req, res, urlUtil.parse(req.url, true).query)
        }
        res.statusCode = 415
        setImmediate(wrapResEnd, res)
        return
      }
      return handler(handle, params, req, res, null, urlUtil.parse(req.url, true).query)
    }

    // Body required
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      // application/json content type
      if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') > -1) {
        return jsonBody(req, res, params, handle)
      // custom parser fir a given content type
      } else if (handle.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
        return handle.contentTypeParser.run(req.headers['content-type'], handler, handle, params, req, res, urlUtil.parse(req.url, true).query)
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

function jsonBody (req, res, params, handle) {
  var body = ''
  req.on('error', onError)
  req.on('data', onData)
  req.on('end', onEnd)
  function onError (err) {
    jsonBodyParsed(err, null, req, res, params, handle)
  }
  function onData (chunk) {
    body += chunk
  }
  function onEnd () {
    setImmediate(parse, body)
  }
  function parse (json) {
    try {
      jsonBodyParsed(null, JSON.parse(body), req, res, params, handle)
    } catch (err) {
      jsonBodyParsed(err, null, req, res, params, handle)
    }
  }
}

function jsonBodyParsed (err, body, req, res, params, handle) {
  if (err) {
    res.statusCode = 422
    setImmediate(wrapResEnd, res)
    return
  }
  handler(handle, params, req, res, body, urlUtil.parse(req.url, true).query)
}

function handler (handle, params, req, res, body, query) {
  var valid = validateSchema(handle, params, body, query)
  if (valid !== true) {
    res.statusCode = 400
    setImmediate(wrapResEnd, res, valid)
    return
  }

  // preHandler hook
  setImmediate(
    runHooks,
    new State(new handle.Request(params, req, body, query, req.log), new handle.Reply(req, res, handle), handle),
    hookIterator,
    handle.hooks.preHandler,
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
  var result = this.handle.handler(this.request, this.reply)
  if (result && typeof result.then === 'function') {
    this.reply.send(result)
  }
}

function wrapResEnd (res, payload) {
  res.end(payload)
  return
}

module.exports = build
module.exports[Symbol.for('internals')] = { jsonBody, jsonBodyParsed, routerHandler, handler }
