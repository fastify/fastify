'use strict'

const supportedHooks = [
  'onRequest',
  'preHandler',
  'onResponse',
  'onSend',
  // only for validation
  'onRoute',
  'onClose'
]

function Hooks () {
  this.onRequest = []
  this.preHandler = []
  this.onResponse = []
  this.onSend = []
}

Hooks.prototype.validate = function (hook, fn) {
  if (typeof hook !== 'string') throw new TypeError('The hook name must be a string')
  if (typeof fn !== 'function') throw new TypeError('The hook callback must be a function')
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
  hooks.preHandler = h.preHandler.slice()
  hooks.onSend = h.onSend.slice()
  hooks.onResponse = h.onResponse.slice()
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
