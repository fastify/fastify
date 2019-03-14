'use strict'

const supportedHooks = [
  'onRequest',
  'preParsing',
  'preValidation',
  'preSerialization',
  'preHandler',
  'onResponse',
  'onSend',
  'onError',
  // executed at start/close time
  'onRoute',
  'onRegister',
  'onClose'
]
const {
  codes: {
    FST_ERR_HOOK_INVALID_TYPE,
    FST_ERR_HOOK_INVALID_HANDLER
  }
} = require('./errors')

function Hooks () {
  this.onRequest = []
  this.preParsing = []
  this.preValidation = []
  this.preSerialization = []
  this.preHandler = []
  this.onResponse = []
  this.onSend = []
  this.onError = []
}

Hooks.prototype.validate = function (hook, fn) {
  if (typeof hook !== 'string') throw new FST_ERR_HOOK_INVALID_TYPE()
  if (typeof fn !== 'function') throw new FST_ERR_HOOK_INVALID_HANDLER()
  if (supportedHooks.indexOf(hook) === -1) {
    throw new Error(`${hook} hook not supported!`)
  }
}

Hooks.prototype.add = function (hook, fn) {
  this.validate(hook, fn)
  this[hook].push(fn)
}

function buildHooks (h) {
  const hooks = new Hooks()
  hooks.onRequest = h.onRequest.slice()
  hooks.preParsing = h.preParsing.slice()
  hooks.preValidation = h.preValidation.slice()
  hooks.preSerialization = h.preSerialization.slice()
  hooks.preHandler = h.preHandler.slice()
  hooks.onSend = h.onSend.slice()
  hooks.onResponse = h.onResponse.slice()
  hooks.onError = h.onError.slice()
  return hooks
}

function hookRunner (functions, runner, request, reply, cb) {
  var i = 0

  function next (err) {
    if (err || i === functions.length) {
      cb(err, request, reply)
      return
    }

    const result = runner(functions[i++], request, reply, next)
    if (result && typeof result.then === 'function') {
      result.then(handleResolve, handleReject)
    }
  }

  function handleResolve () {
    next()
  }

  function handleReject (err) {
    cb(err, request, reply)
  }

  next()
}

function onSendHookRunner (functions, request, reply, payload, cb) {
  var i = 0

  function next (err, newPayload) {
    if (err) {
      cb(err, request, reply, payload)
      return
    }

    if (newPayload !== undefined) {
      payload = newPayload
    }

    if (i === functions.length) {
      cb(null, request, reply, payload)
      return
    }

    const result = functions[i++](request, reply, payload, next)
    if (result && typeof result.then === 'function') {
      result.then(handleResolve, handleReject)
    }
  }

  function handleResolve (newPayload) {
    next(null, newPayload)
  }

  function handleReject (err) {
    cb(err, request, reply, payload)
  }

  next()
}

function hookIterator (fn, request, reply, next) {
  if (reply.sent === true) return undefined
  return fn(request, reply, next)
}

module.exports = {
  Hooks,
  buildHooks,
  hookRunner,
  onSendHookRunner,
  hookIterator
}
