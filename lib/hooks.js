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

Hooks.prototype.prependHooks = function (hooks) {
  this.onRequest.unshift.apply(this.onRequest, hooks.onRequest)
  this.preHandler.unshift.apply(this.preHandler, hooks.preHandler)
  this.onSend.unshift.apply(this.onSend, hooks.onSend)
  this.onResponse.unshift.apply(this.onResponse, hooks.onResponse)
}

module.exports = Hooks
