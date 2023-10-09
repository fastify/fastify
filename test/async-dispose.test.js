'use strict'

const t = require('tap')
const Fastify = require('../fastify')

// asyncDispose doesn't exist in node <= 16
t.test('async dispose should close fastify', { skip: !('asyncDispose' in Symbol) }, async t => {
  t.plan(2)

  const fastify = Fastify()

  await fastify.listen({ port: 0 })

  t.equal(fastify.server.listening, true)

  // the same as syntax sugar for
  // await using app = fastify()
  await fastify[Symbol.asyncDispose]()

  t.equal(fastify.server.listening, false)
})
