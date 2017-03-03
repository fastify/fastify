'use strict'

const hooks = {
  onRequest: [],
  onRequestRaw: []
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

function _add (hook, f) {
  if (!hooks[hook]) {
    throw new Error(`${hook} hook not supported!`)
  }
  hooks[hook].push(f)
}

function get () {
  return hooks
}

get.onRequest = function () {
  return hooks.onRequest
}

get.onRequestRaw = function () {
  return hooks.onRequestRaw
}

module.exports = {
  get: get,
  add: add
}
