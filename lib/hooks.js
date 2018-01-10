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

module.exports = Hooks
module.exports.buildHooks = buildHooks
