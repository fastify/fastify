'use strict'

/* c8 ignore start */

const assert = require('node:assert')
const fastify = require('fastify')
const exercise = require('./exercise.cjs')

const named = require('fastify')

assert.deepStrictEqual(Object.keys(named).sort(), ['LogController', 'default', 'errorCodes', 'fastify'])
assert.strictEqual(named.fastify, fastify)
assert.strictEqual(named.default, fastify)

exercise(named).catch(error => {
  console.error(error)
  process.exit(1)
})
