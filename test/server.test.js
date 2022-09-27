'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('listen should accept null port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: null }, (err) => {
    t.error(err)
  })
})

test('listen should accept undefined port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: undefined }, (err) => {
    t.error(err)
  })
})

test('listen should accept stringified number port', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({ port: '1234' }, (err) => {
    t.error(err)
  })
})

test('listen should reject string port', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  try {
    await fastify.listen({ port: 'hello-world' })
  } catch (error) {
    t.same(error.message, 'options.port should be >= 0 and < 65536. Received hello-world.')
  }

  try {
    await fastify.listen({ port: '1234hello' })
  } catch (error) {
    t.same(error.message, 'options.port should be >= 0 and < 65536. Received 1234hello.')
  }
})
