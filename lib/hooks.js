'use strict'

const supportedHooks = [
  'onRequest',
  'preRouting',
  'preHandler',
  'onClose'
]

function Hooks (fastify) {
  this.onRequest = []
  this.preRouting = []
  this.preHandler = []
  this._fastify = fastify
}

Hooks.prototype.add = function (hook, fn) {
  if (typeof hook !== 'string') throw new TypeError('The hook name must be a string')
  if (typeof fn !== 'function') throw new TypeError('The hook callback must be a function')
  if (supportedHooks.indexOf(hook) === -1) {
    throw new Error(`${hook} hook not supported!`)
  }

  if (hook === 'onClose') {
    this._fastify.onClose(fn)
  } else {
    this[hook].push(fn)
  }
}

function buildHooks (h) {
  function _Hooks () {}
  _Hooks.prototype = new Hooks()
  const H = new _Hooks()
  H.onRequest = h.onRequest
  H.preRouting = h.preRouting
  H.preHandler = Object.create(h.preHandler)
  H._fastify = h._fastify
  return H
}

module.exports = Hooks
module.exports.buildHooks = buildHooks
