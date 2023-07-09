'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const semver = require('semver')

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

test('listen should accept log text resolution function', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  fastify.listen({
    host: '127.0.0.1',
    port: '1234',
    listenTextResolver: (address) => {
      t.equal(address, 'http://127.0.0.1:1234')
      t.pass('executed')
      return 'hardcoded text'
    }
  }, (err) => {
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
    t.equal(error.code, 'ERR_SOCKET_BAD_PORT')
  }

  try {
    await fastify.listen({ port: '1234hello' })
  } catch (error) {
    t.equal(error.code, 'ERR_SOCKET_BAD_PORT')
  }
})

test('listen should not start server if received abort signal', { skip: semver.lt(process.version, '16') }, t => {
  t.plan(1)

  const controller = new AbortController()

  const fastify = Fastify()
  fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
    t.error(err)
  })
  controller.abort()
  t.equal(fastify.server.listening, false)
})
