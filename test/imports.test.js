'use strict'

const t = require('tap')
const test = t.test

test('should import as default', t => {
  t.plan(2)
  const fastify = require('..')
  t.ok(fastify)
  t.is(typeof fastify, 'function')
})

test('should import as esm', t => {
  t.plan(2)
  const { fastify } = require('..')
  t.ok(fastify)
  t.is(typeof fastify, 'function')
})
