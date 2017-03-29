'use strict'

const supportedHooks = [
  'onRequest',
  'preRouting',
  'preHandler',
  'onClose'
]

function hooksManager () {
  const hooks = {
    onRequest: [],
    preRouting: [],
    preHandler: [],
    onClose: []
  }

  function add (hook, fn) {
    if (typeof hook !== 'string') throw new TypeError('The hook name must be a string')
    if (typeof fn !== 'function') throw new TypeError('The hook callback must be a function')
    if (supportedHooks.indexOf(hook) === -1) {
      throw new Error(`${hook} hook not supported!`)
    }

    hooks[hook].push(fn)
    return this
  }

  function get () {
    return hooks
  }

  get.onRequest = function () {
    return hooks.onRequest
  }

  get.preRouting = function () {
    return hooks.preRouting
  }

  get.preHandler = function () {
    return hooks.preHandler
  }

  get.onClose = function () {
    return hooks.onClose
  }

  return {
    add: add,
    get: get
  }
}

module.exports = hooksManager
