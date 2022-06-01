'use strict'

const assert = require('assert')

module.exports = function (fastify, opts, done) {
  assert.strictEqual(fastify.pluginName, 'test-plugin')
  assert.strictEqual(fastify.hasPlugin('test-plugin'), true)
  done()
}

module.exports[Symbol.for('fastify.display-name')] = 'test-plugin'
