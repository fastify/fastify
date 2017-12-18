/* eslint-disable no-useless-return */
'use strict'

const fastJsonStringify = require('fast-json-stringify')
const urlUtil = require('url')
const validation = require('./validation')
const validateSchema = validation.validate
const isError = require('./reply').isError

const schemas = require('./schemas.json')
const inputSchemaError = fastJsonStringify(schemas.inputSchemaError)

function handleRequest (req, res, params, context) {
  var method = req.method

  if (method === 'GET' || method === 'HEAD') {
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

    wrapReplyEnd(context, req, res, 415, params, null, urlUtil.parse(req.url, true).query, null)
    return
  }

  if (method === 'OPTIONS' || method === 'DELETE') {
    if (req.headers['content-type']) {
      // application/json content type
      if (req.headers['content-type'].indexOf('application/json') > -1) {
        return jsonBody(req, res, params, context)
      // custom parser for a given content type
      } else if (context.contentTypeParser.fastHasHeader(req.headers['content-type'])) {
        return context.contentTypeParser.run(req.headers['content-type'], handler, context, params, req, res, urlUtil.parse(req.url, true).query)
      }

      wrapReplyEnd(context, req, res, 415, params, null, urlUtil.parse(req.url, true).query, null)
      return
    }
    return handler(context, params, req, res, null, urlUtil.parse(req.url, true).query)
  }

  wrapReplyEnd(context, req, res, 405, params, null, urlUtil.parse(req.url, true).query, null)
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
    var parsed
    try {
      parsed = JSON.parse(body)
    } catch (err) {
      jsonBodyParsed(err, null, req, res, params, context)
      return
    }
    jsonBodyParsed(null, parsed, req, res, params, context)
  }
}

function jsonBodyParsed (err, body, req, res, params, context) {
  var query = urlUtil.parse(req.url, true).query
  if (err) {
    wrapReplyEnd(context, req, res, 422, params, body, query, null)
    return
  }
  handler(context, params, req, res, body, query)
}

function handler (context, params, req, res, body, query, headers) {
  var request = new context.Request(params, req, body, query, req.headers, req.log)
  var valid = validateSchema(context, request)
  if (valid !== true) {
    wrapReplyEnd(context, req, res, 400, params, body, query, wrapValidationError(valid))
    return
  }

  // preHandler hook
  if (context.preHandler !== null) {
    context.preHandler(
      hookIterator,
      new State(request, new context.Reply(res, context, request), context),
      preHandlerCallback
    )
  } else {
    preHandlerCallback(null, new State(request, new context.Reply(res, context, request), context))
  }
}

function State (request, reply, context) {
  this.request = request
  this.reply = reply
  this.context = context
}

function hookIterator (fn, state, next) {
  return fn(state.request, state.reply, next)
}

function preHandlerCallback (err, state) {
  if (err) {
    state.reply.send(err)
    return
  }

  var result = state.context.handler(state.request, state.reply)
  if (result && typeof result.then === 'function') {
    result.then((payload) => {
      // this is for async functions that
      // are using reply.send directly
      if (payload !== undefined || (state.reply.res.statusCode === 204 && !state.reply.sent)) {
        state.reply.send(payload)
      }
    }).catch((err) => {
      state.reply[isError] = true
      state.reply.send(err)
    })
  }
}

function wrapReplyEnd (context, req, res, statusCode, params, body, query, payload) {
  const request = new context.Request(params, req, body, query, req.headers, req.log)
  const reply = new context.Reply(res, context, request)
  if (payload instanceof Error) {
    reply.code(statusCode).send(payload)
  } else {
    reply.code(statusCode).send(new Error(payload || ''))
  }
  return
}

function wrapValidationError (valid) {
  if (valid instanceof Error) {
    return valid
  }
  var error = new Error(inputSchemaError(valid))
  error.validation = valid
  return error
}

module.exports = handleRequest
module.exports[Symbol.for('internals')] = { jsonBody, jsonBodyParsed, handler }
