'use strict'

const supportedHooks = [
  'preMiddleware',
  'postMiddleware', 'preRouting',
  'postRouting', 'preParsing',
  'postParsing', 'preValidation',
  'postValidation', 'preHandler'
]

function hooksManager () {
  const hooks = {
    preMiddleware: [],
    preRouting: [],
    preParsing: [],
    preValidation: [],
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

    if (hook === 'postMiddleware') hook = 'preRouting'
    if (hook === 'postRouting') hook = 'preParsing'
    if (hook === 'postParsing') hook = 'preValidation'
    if (hook === 'postValidation') hook = 'preHandler'

    hooks[hook].push(fn)
  }

  function get () {
    return hooks
  }

  get.preMiddleware = function () {
    return hooks.preMiddleware
  }

  get.preRouting = get.postMiddleware = function () {
    return hooks.preRouting
  }

  get.preParsing = get.postRouting = function () {
    return hooks.preParsing
  }

  get.preValidation = get.postParsing = function () {
    return hooks.preValidation
  }

  get.preHandler = get.postValidation = function () {
    return hooks.preHandler
  }

  return {
    add: add,
    get: get
  }
}

module.exports = hooksManager
