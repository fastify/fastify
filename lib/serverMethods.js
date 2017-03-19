'use strict'

function addServerMethod (name, fn, dependencies) {
  if (checkExistence(this, name)) {
    throw new Error(`The plugin ${name} has been already added!`)
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

function checkDependencies (instance, deps) {
  if (!deps) {
    deps = instance
    instance = this
  }
  for (var i = 0; i < deps.length; i++) {
    if (!checkExistence(instance, deps[i])) {
      throw new Error(`Fastify plugin: missing dependency: '${deps[i]}'.`)
    }
  }
}

module.exports = {
  add: addServerMethod,
  exist: checkExistence,
  dependencies: checkDependencies
}
