'use strict'

const supportedHooks = [
  'onRoute'
]

function GlobalHooks () {
  this.onRoute = []
}

GlobalHooks.prototype.validate = function (hook, fn) {
  if (typeof hook !== 'string') throw new TypeError('The hook name must be a string')
  if (typeof fn !== 'function') throw new TypeError('The hook callback must be a function')
  if (supportedHooks.indexOf(hook) === -1) {
    throw new Error(`${hook} hook not supported!`)
  }
}

GlobalHooks.prototype.add = function (hook, fn) {
  this.validate(hook, fn)
  this[hook].push(fn)
}

module.exports = GlobalHooks
