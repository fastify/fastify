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
    return instance
  }

  instance[name] = fn
  return instance
}

function decorateFastify (name, fn, dependencies) {
  return decorate(this, name, fn, dependencies)
}

function checkExistence (instance, name) {
  if (!name) {
    name = instance
    instance = this
  }

  const prototype = instance.prototype || instance

  return name in instance || name in prototype
}

function checkRequestExistence (name) {
  return checkExistence(this._Request, name)
}

function checkReplyExistence (name) {
  return checkExistence(this._Reply, name)
}

function checkDependencies (instance, deps) {
  for (var i = 0; i < deps.length; i++) {
    if (!checkExistence(instance, deps[i])) {
      throw new Error(`Fastify decorator: missing dependency: '${deps[i]}'.`)
    }
  }
}

function decorateReply (name, fn, dependencies) {
  return decorate(this._Reply.prototype, name, fn, dependencies)
}

function decorateRequest (name, fn, dependencies) {
  return decorate(this._Request.prototype, name, fn, dependencies)
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
