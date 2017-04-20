/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
const validation = require('./validation')
const validateSchema = validation.validate

function handleRequest (req, res, params, store) {
  var method = req.method

  if (method === 'GET' || method === 'DELETE' || method === 'HEAD') {
    return handler(store, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // application/json content type
    if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') > -1) {
      return jsonBody(req, res, params, store)
    }

    // custom parser for a given content type
    if (store.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
      return store.contentTypeParser.run(req.headers['content-type'], handler, store, params, req, res, urlUtil.parse(req.url, true).query)
    }
  }

  if (method === 'OPTIONS') {
    if (req.headers['content-type']) {
      // application/json content type
      if (req.headers['content-type'].indexOf('application/json') > -1) {
        return jsonBody(req, res, params, store)
      // custom parser for a given content type
      } else if (store.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
        return store.contentTypeParser.run(req.headers['content-type'], handler, store, params, req, res, urlUtil.parse(req.url, true).query)
      }
      setImmediate(wrapResEnd, res, '', 415)
      return
    }
    return handler(store, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  setImmediate(wrapResEnd, res, '', 415)
  return
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
    setImmediate(wrapResEnd, res, '', 422)
    return
  }
  handler(handle, params, req, res, body, urlUtil.parse(req.url, true).query)
}

function handler (store, params, req, res, body, query) {
  var valid = validateSchema(store, params, body, query)
  if (valid !== true) {
    setImmediate(wrapResEnd, res, valid, 400)
    return
  }

  // preHandler hook
  setImmediate(
    runHooks,
    new State(new store.Request(params, req, body, query, req.log), new store.Reply(req, res, store), store),
    hookIterator,
    store.hooks.preHandler,
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

function wrapResEnd (res, payload, statusCode) {
  res.statusCode = statusCode
  res.end(payload)
  return
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { jsonBody, jsonBodyParsed, handler }
