'use strict'

/* eslint no-prototype-builtins: 0 */

const {
  kReply,
  kRequest
} = require('./symbols.js')

const {
  codes: {
    FST_ERR_DEC_ALREADY_PRESENT,
    FST_ERR_DEC_MISSING_DEPENDENCY
  }
} = require('./errors')

function decorate (instance, name, fn, dependencies) {
  if (instance.hasOwnProperty(name)) {
    throw new FST_ERR_DEC_ALREADY_PRESENT(name)
  }

  if (dependencies) {
    checkDependencies(instance, dependencies)
  }

  if (fn && (typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    Object.defineProperty(instance, name, {
      get: fn.getter,
      set: fn.setter
    })
  } else {
    instance[name] = fn
  }
}

function decorateFastify (name, fn, dependencies) {
  decorate(this, name, fn, dependencies)
  return this
}

function checkExistence (instance, name) {
  if (name) {
    return name in instance
  }

  return instance in this
}

function checkRequestExistence (name) {
  return checkExistence(this[kRequest].prototype, name)
}

function checkReplyExistence (name) {
  return checkExistence(this[kReply].prototype, name)
}

function checkDependencies (instance, deps) {
  for (var i = 0; i < deps.length; i++) {
    if (!checkExistence(instance, deps[i])) {
      throw new FST_ERR_DEC_MISSING_DEPENDENCY(deps[i])
    }
  }
}

function decorateReply (name, fn, dependencies) {
  decorate(this[kReply].prototype, name, fn, dependencies)
  return this
}

function decorateRequest (name, fn, dependencies) {
  decorate(this[kRequest].prototype, name, fn, dependencies)
  return this
}

module.exports = {
  add: decorateFastify,
  exist: checkExistence,
  existRequest: checkRequestExistence,
  existReply: checkReplyExistence,
  dependencies: checkDependencies,
  decorateReply: decorateReply,
  decorateRequest: decorateRequest
}
