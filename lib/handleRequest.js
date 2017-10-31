/* eslint-disable no-useless-return */
'use strict'

const urlUtil = require('url')
const runHooks = require('fastseries')()
const validation = require('./validation')
const validateSchema = validation.validate

function handleRequest (req, res, params, context) {
  var method = req.method

  if (method === 'GET' || method === 'DELETE' || method === 'HEAD') {
    return handler(context, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    // application/json content type
    if (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') > -1) {
      return jsonBody(req, res, params, context)
    }

    // custom parser for a given content type
    if (context.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
      return context.contentTypeParser.run(req.headers['content-type'], handler, context, params, req, res, urlUtil.parse(req.url, true).query)
    }

    setImmediate(wrapReplyEnd, context, req, res, 415)
    return
  }

  if (method === 'OPTIONS') {
    if (req.headers['content-type']) {
      // application/json content type
      if (req.headers['content-type'].indexOf('application/json') > -1) {
        return jsonBody(req, res, params, context)
      // custom parser for a given content type
      } else if (context.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
        return context.contentTypeParser.run(req.headers['content-type'], handler, context, params, req, res, urlUtil.parse(req.url, true).query)
      }

      setImmediate(wrapReplyEnd, context, req, res, 415)
      return
    }
    return handler(context, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  setImmediate(wrapReplyEnd, context, req, res, 405)
  return
}

function jsonBody (req, res, params, context) {
  var body = ''
  req.on('error', onError)
  req.on('data', onData)
  req.on('end', onEnd)
  function onError (err) {
    jsonBodyParsed(err, null, req, res, params, context)
  }
  function onData (chunk) {
    body += chunk
  }
  function onEnd () {
    setImmediate(parse, body)
  }
  function parse (json) {
    try {
      jsonBodyParsed(null, JSON.parse(body), req, res, params, context)
    } catch (err) {
      jsonBodyParsed(err, null, req, res, params, context)
    }
  }
}

function jsonBodyParsed (err, body, req, res, params, context) {
  if (err) {
    setImmediate(wrapReplyEnd, context, req, res, 422)
    return
  }
  handler(context, params, req, res, body, urlUtil.parse(req.url, true).query)
}

function handler (context, params, req, res, body, query, headers) {
  var request = new context.Request(params, req, body, query, req.headers, req.log)
  var valid = validateSchema(context, request)
  if (valid !== true) {
    setImmediate(wrapReplyEnd, context, req, res, 400, valid)
    return
  }

  // preHandler hook
  setImmediate(
    runHooks,
    new State(request, new context.Reply(req, res, context, request), context),
    hookIterator,
    context.preHandler,
    preHandlerCallback
  )
}

function State (request, reply, context) {
  this.request = request
  this.reply = reply
  this.context = context
}

function hookIterator (fn, cb) {
  var ret = fn(this.request, this.reply, cb)
  if (ret && typeof ret.then === 'function') {
    ret.then(cb).catch(cb)
  }
}

function preHandlerCallback (err, code) {
  if (err) {
    if (code[0]) this.reply.code(code[0])
    this.reply.send(err)
    return
  }

  var result = this.context.handler(this.request, this.reply)
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

function wrapReplyEnd (context, req, res, statusCode, payload) {
  const reply = new context.Reply(req, res, context)
  if (payload instanceof Error) {
    reply.code(statusCode).send(payload)
  } else {
    reply.code(statusCode).send(new Error(payload || ''))
  }
  return
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { jsonBody, jsonBodyParsed, handler }
