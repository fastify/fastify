'use strict'

const { test } = require('tap')
const Fastify = require('..')
const cors = require('cors')
const {
  codes: {
    FST_ERR_MISSING_MIDDLEWARE
  }
} = require('../lib/errors')

test('Should throw if the basic use API has not been overridden', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.use(cors())
    t.fail('Should throw')
  } catch (err) {
    t.ok(err instanceof FST_ERR_MISSING_MIDDLEWARE)
  }
})

test('Should be able to override the default use API', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.decorate('use', () => true)
  t.strictEqual(fastify.use(), true)
})
