/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
const Reply = require('./reply')
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

    setImmediate(wrapReplyEnd, req, res, 415)
    return
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

      setImmediate(wrapReplyEnd, req, res, 415)
      return
    }
    return handler(store, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  setImmediate(wrapReplyEnd, req, res, 405)
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
    setImmediate(wrapReplyEnd, req, res, 422)
    return
  }
  handler(handle, params, req, res, body, urlUtil.parse(req.url, true).query)
}

function handler (store, params, req, res, body, query, headers) {
  var request = new store.Request(params, req, body, query, req.headers, req.log)
  var valid = validateSchema(store, request)
  if (valid !== true) {
    setImmediate(wrapReplyEnd, req, res, 400, valid)
    return
  }

  // preHandler hook
  setImmediate(
    runHooks,
    new State(request, new store.Reply(req, res, store), store),
    hookIterator,
    store.preHandler,
    preHandlerCallback
  )
}

function State (request, reply, store) {
  this.request = request
  this.reply = reply
  this.store = store
}

function hookIterator (fn, cb) {
  fn(this.request, this.reply, cb)
}

function preHandlerCallback (err, code) {
  if (err) {
    if (code[0]) this.reply.code(code[0])
    this.reply.send(err)
    return
  }

  var result = this.store.handler(this.request, this.reply)
  if (result && typeof result.then === 'function') {
    result.then((payload) => {
      // this is for async functions that
      // are using reply.send directly
      if (payload !== undefined || this.reply.res.statusCode === 204) {
        this.reply.send(payload)
      }
    }).catch((err) => {
      this.reply.send(err)
    })
  }
}

function wrapReplyEnd (req, res, statusCode, payload) {
  const reply = new Reply(req, res, null)
  if (payload instanceof Error) {
    reply.code(statusCode).send(payload)
  } else {
    reply.code(statusCode).send(new Error(payload || ''))
  }
  return
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { jsonBody, jsonBodyParsed, handler }
