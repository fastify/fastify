'use strict'

const supportedHooks = [
  'onRequest',
  'preHandler',
  'onResponse',
  'onSend',
  'onClose' // not used here but we need to validate it anyway
]

function Hooks () {
  this.onRequest = []
  this.preHandler = []
  this.onResponse = []
  this.onSend = []
}

Hooks.prototype.add = function (hook, fn) {
  if (typeof hook !== 'string') throw new TypeError('The hook name must be a string')
  if (typeof fn !== 'function') throw new TypeError('The hook callback must be a function')
  if (supportedHooks.indexOf(hook) === -1) {
    throw new Error(`${hook} hook not supported!`)
  }

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
