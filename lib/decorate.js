'use strict'

function decorate (name, fn, dependencies) {
  if (checkExistence(this, name)) {
    throw new Error(`The decorator '${name}' has been already added!`)
  }

  if (dependencies) {
    checkDependencies(this, dependencies)
  }

  this[name] = fn
  return this
}

function checkExistence (instance, name) {
  if (!name) {
    name = instance
    instance = this
  }
  return name in instance
}

function checkExistenceInPrototype (klass, name) {
  return name in klass.prototype
}

function checkDependencies (instance, deps) {
  for (var i = 0; i < deps.length; i++) {
    if (!checkExistence(instance, deps[i])) {
      throw new Error(`Fastify decorator: missing dependency: '${deps[i]}'.`)
    }
  }
}

function decorateReply (name, fn, dependencies) {
  if (checkExistenceInPrototype(this._Reply, name)) {
    throw new Error(`The decorator '${name}' has been already added to Reply!`)
  }

  if (dependencies) {
    checkDependencies(this._Reply, dependencies)
  }

  this._Reply.prototype[name] = fn
  return this
}

function extendServerError (fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('The server error object must be a function')
  }

  this._Reply.prototype['_extendServerError'] = fn
  return this
}

function decorateRequest (name, fn, dependencies) {
  if (checkExistenceInPrototype(this._Request, name)) {
    throw new Error(`The decorator '${name}' has been already added to Request!`)
  }

  if (dependencies) {
    checkDependencies(this._Request, dependencies)
  }

  this._Request.prototype[name] = fn
  return this
}

module.exports = {
  add: decorate,
  exist: checkExistence,
  dependencies: checkDependencies,
  decorateReply: decorateReply,
  decorateRequest: decorateRequest,
  extendServerError: extendServerError
}
