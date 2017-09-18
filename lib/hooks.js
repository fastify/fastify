'use strict'

const supportedHooks = [
  'onRequest',
  'preHandler',
  'onResponse',
  'onClose' // not used here but we need to validate it anyway
]

function Hooks () {
  this.onRequest = []
  this.preHandler = []
  this.onResponse = []
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
  function _Hooks () {}
  _Hooks.prototype = new Hooks()
  const H = new _Hooks()
  H.onRequest = Object.create(h.onRequest)
  H.preHandler = Object.create(h.preHandler)
  H.onResponse = Object.create(h.onResponse)
  return H
}

module.exports = Hooks
module.exports.buildHooks = buildHooks
