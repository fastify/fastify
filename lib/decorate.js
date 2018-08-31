'use strict'

function decorate (instance, name, fn, dependencies) {
  if (checkExistence(instance, name)) {
    throw new Error(`The decorator '${name}' has already been added!`)
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
  return checkExistence(this._Request.prototype, name)
}

function checkReplyExistence (name) {
  return checkExistence(this._Reply.prototype, name)
}

function checkDependencies (instance, deps) {
  for (var i = 0; i < deps.length; i++) {
    if (!checkExistence(instance, deps[i])) {
      throw new Error(`Fastify decorator: missing dependency: '${deps[i]}'.`)
    }
  }
}

function decorateReply (name, fn, dependencies) {
  decorate(this._Reply.prototype, name, fn, dependencies)
  return this
}

function decorateRequest (name, fn, dependencies) {
  decorate(this._Request.prototype, name, fn, dependencies)
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
