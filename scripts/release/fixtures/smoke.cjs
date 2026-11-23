'use strict'

const assert = require('node:assert')
const Fastify = require('fastify')
const exercise = require('./exercise.cjs')

assert.strictEqual(Fastify.default, Fastify)

exercise(Fastify, require('fastify')).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
