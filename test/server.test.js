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

test('listen should not start server if received abort signal', t => {
  t.plan(1)

  let abortCallback
  const controller = new AbortController()
  controller.signal.addEventListener = (event, callback) => {
    abortCallback = callback
  }

  const fastify = Fastify()
  fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
    t.error(err)
  })
  abortCallback()
  t.equal(fastify.server.listening, false)
})
