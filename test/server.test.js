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

test('abort signal', { skip: semver.lt(process.version, '16.0.0') }, t => {
  t.test('listen should not start server', t => {
    t.plan(2)
    function onClose (instance, done) {
      t.type(fastify, instance)
      done()
    }
    const controller = new AbortController()

    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.error(err)
    })
    controller.abort()
    t.equal(fastify.server.listening, false)
  })

  t.test('listen should not start server if already aborted', t => {
    t.plan(2)
    function onClose (instance, done) {
      t.type(fastify, instance)
      done()
    }

    const controller = new AbortController()
    controller.abort()
    const fastify = Fastify()
    fastify.addHook('onClose', onClose)
    fastify.listen({ port: 1234, signal: controller.signal }, (err) => {
      t.error(err)
    })
    t.equal(fastify.server.listening, false)
  })

  t.test('listen should throw if received invalid signal', t => {
    t.plan(2)
    const fastify = Fastify()

    try {
      fastify.listen({ port: 1234, signal: {} }, (err) => {
        t.error(err)
      })
      t.fail()
    } catch (e) {
      t.equal(e.code, 'FST_ERR_LISTEN_OPTIONS_INVALID')
      t.equal(e.message, 'Invalid listen options: \'Invalid options.signal\'')
    }
  })

  t.end()
})
