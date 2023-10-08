'use strict'

const t = require('tap')
const Fastify = require('../fastify')

t.test('async dispose should close fastify', async t => {
  t.plan(1)

  const fastify = Fastify()

  await fastify.listen({ port: 0 })

  t.equal(fastify.server.listening, true)

  // the same as syntax sugar for
  // await using app = fastify()
  await fastify[Symbol.asyncDispose]()

  t.equal(fastify.server.listening, false)
})
