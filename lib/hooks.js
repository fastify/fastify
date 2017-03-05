'use strict'

const supportedHooks = [
  'onRequest',
  'preRouting',
  'preHandler'
]

function hooksManager () {
  const hooks = {
    onRequest: [],
    preRouting: [],
    preHandler: []
  }

  function add (hook) {
    var key = ''
    if (Array.isArray(hook)) {
      for (var i = 0; i < hook.length; i++) {
        key = Object.keys(hook[i])[0]
        _add(key, hook[i][key])
      }
    } else {
      key = Object.keys(hook)[0]
      _add(key, hook[key])
    }
  }

  function _add (hook, fn) {
    if (supportedHooks.indexOf(hook) === -1) {
      throw new Error(`${hook} hook not supported!`)
    }

    hooks[hook].push(fn)
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

  return {
    add: add,
    get: get
  }
}

module.exports = hooksManager
