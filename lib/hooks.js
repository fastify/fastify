'use strict'

const supportedHooks = [
  'onRequest',
  'preRouting',
  'preHandler',
  'onClose'
]

function Hooks () {
  this.onRequest = []
  this.preRouting = []
  this.preHandler = []
  this.onClose = []
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
  H.onRequest = h.onRequest
  H.preRouting = h.preRouting
  H.preHandler = Object.create(h.preHandler)
  H.onClose = h.onClose
  return H
}

module.exports = Hooks
module.exports.buildHooks = buildHooks
