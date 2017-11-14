'use strict'

const assert = require('assert')

function getMeta (fn) {
  return fn[Symbol.for('plugin-meta')]
}

function shouldSkipOverride (fn) {
  return !!fn[Symbol.for('skip-override')]
}

function checkDependencies (fn) {
  const meta = getMeta(fn)
  if (!meta) return

  const deps = meta.dependencies
  if (!deps) return

  if (deps.fastify) _checkDependencies.call(this, 'Fastify', deps.fastify)
  if (deps.reply) _checkDependencies.call(this._Reply, 'Reply', deps.reply)
  if (deps.request) _checkDependencies.call(this._Request, 'Request', deps.request)
}

function _checkDependencies (instance, deps) {
  assert(Array.isArray(deps), 'The dependencies should be an array of strings')

  deps.forEach(dep => {
    assert(
      instance === 'Fastify' ? dep in this : dep in this.prototype,
      `The dependency '${dep}' is not present in ${instance}`
    )
  })
}

module.exports = {
  getMeta,
  shouldSkipOverride,
  checkDependencies
}
