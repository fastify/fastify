'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('root fastify instance is an object', t => {
  t.plan(1)
  t.type(Fastify(), 'object')
})
