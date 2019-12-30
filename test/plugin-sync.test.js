'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')
const {
  codes: {
    FST_ERR_SYNC_PLUGIN
  }
} = require('../lib/errors')

test('Register a plugin synchronously / 1', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.registerSync(fp(plugin))
  t.strictEqual(fastify.foo, 'bar')

  fastify.ready(() => {
    t.strictEqual(fastify.foo, 'bar')
  })

  function plugin (fastify, opts) {
    fastify.decorate('foo', 'bar')
  }
})

test('Register a plugin synchronously / 2', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.registerSync(fp(pluginSync))
  fastify.register(fp(pluginAsync))

  t.strictEqual(fastify.foo, 'bar')
  t.strictEqual(fastify.faz, undefined)

  fastify.ready(() => {
    t.strictEqual(fastify.foo, 'bar')
    t.strictEqual(fastify.faz, 'baz')
  })

  function pluginSync (fastify, opts) {
    fastify.decorate('foo', 'bar')
  }

  function pluginAsync (fastify, opts, next) {
    fastify.decorate('faz', 'baz')
    next()
  }
})

test('Register a plugin synchronously / 3', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fp(pluginAsync))

  fastify.ready(() => {
    t.strictEqual(fastify.foo, 'bar')
    t.strictEqual(fastify.faz, 'baz')
  })

  function pluginSync (fastify, opts) {
    fastify.decorate('foo', 'bar')
  }

  function pluginAsync (fastify, opts, next) {
    fastify.registerSync(fp(pluginSync))
    t.strictEqual(fastify.foo, 'bar')
    fastify.decorate('faz', 'baz')
    next()
  }
})

test('Should throw in case of an async plugin / 1', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.registerSync(plugin)
    t.fail('Should throw')
  } catch (err) {
    t.ok(err instanceof FST_ERR_SYNC_PLUGIN)
  }

  function plugin (fastify, opts, next) {
    next()
  }
})

test('Should throw in case of an async plugin / 2', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.registerSync(plugin)
    t.fail('Should throw')
  } catch (err) {
    t.ok(err instanceof FST_ERR_SYNC_PLUGIN)
  }

  async function plugin (fastify, opts) {}
})

test('Should throw in case of an async plugin / 3', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.registerSync(plugin)
    t.fail('Should throw')
  } catch (err) {
    t.ok(err instanceof FST_ERR_SYNC_PLUGIN)
  }

  function plugin (fastify, opts) {
    return Promise.resolve()
  }
})

test('Register route and hooks inside sync plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.registerSync(plugin)

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.headers.foo, 'bar')
    t.strictEqual(res.payload, 'hello')
  })

  function plugin (fastify, opts) {
    fastify.addHook('onSend', (req, reply, payload, next) => {
      reply.header('foo', 'bar')
      next()
    })

    fastify.get('/', (req, reply) => {
      reply.send('hello')
    })
  }
})

test('Encapsulation support', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.registerSync(plugin)
  t.strictEqual(fastify.foo, undefined)

  fastify.ready(() => {
    t.strictEqual(fastify.foo, undefined)
  })

  function plugin (fastify, opts) {
    fastify.decorate('foo', 'bar')
    fastify.registerSync(nestedPlugin)
  }

  function nestedPlugin (fastify, opts) {
    t.strictEqual(fastify.foo, 'bar')
  }
})
