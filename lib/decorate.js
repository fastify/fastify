'use strict'

/* eslint no-prototype-builtins: 0 */

const {
  kReply,
  kRequest,
  kState
} = require('./symbols.js')

const {
  FST_ERR_DEC_ALREADY_PRESENT,
  FST_ERR_DEC_MISSING_DEPENDENCY,
  FST_ERR_DEC_AFTER_START,
  FST_ERR_DEC_DEPENDENCY_INVALID_TYPE
} = require('./errors')

const warning = require('./warnings')

function decorate (instance, name, fn, dependencies) {
  if (instance.hasOwnProperty(name)) {
    throw new FST_ERR_DEC_ALREADY_PRESENT(name)
  }

  if (dependencies) {
    if (!Array.isArray(dependencies)) {
      throw new FST_ERR_DEC_DEPENDENCY_INVALID_TYPE(name)
    }

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

function checkReferenceType (name, fn) {
  if (typeof fn === 'object' && fn && !(typeof fn.getter === 'function' || typeof fn.setter === 'function')) {
    warning.emit('FSTDEP006', name)
  }
}

function decorateFastify (name, fn, dependencies) {
  assertNotStarted(this, name)
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
  // eslint-disable-next-line no-var
  for (var i = 0; i !== deps.length; ++i) {
    if (!checkExistence(instance, deps[i])) {
      throw new FST_ERR_DEC_MISSING_DEPENDENCY(deps[i])
    }
  }
}

function decorateReply (name, fn, dependencies) {
  assertNotStarted(this, name)
  checkReferenceType(name, fn)
  decorate(this[kReply].prototype, name, fn, dependencies)
  return this
}

function decorateRequest (name, fn, dependencies) {
  assertNotStarted(this, name)
  checkReferenceType(name, fn)
  decorate(this[kRequest].prototype, name, fn, dependencies)
  return this
}

function assertNotStarted (instance, name) {
  if (instance[kState].started) {
    throw new FST_ERR_DEC_AFTER_START(name)
  }
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
