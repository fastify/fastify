'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('should emit warning using genReqId prop in logger options', t => {
  t.plan(1)

  process.once('warning', warning => {
    t.strictEqual(warning.message, `Using 'genReqId' in logger options is deprecated. Use fastify options instead. See: https://www.fastify.io/docs/latest/Server/#gen-request-id`)
  })

  Fastify({ logger: { genReqId: 'test' } })
})
