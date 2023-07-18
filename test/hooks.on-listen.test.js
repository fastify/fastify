'use strict'

const t = require('tap')
const Fastify = require('../fastify')
const fp = require('fastify-plugin')

t.test('***onListen should be called in order***', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function () {
    t.equal(order++, 0, '1st called in root')
  })

  fastify.addHook('onListen', function () {
    t.equal(order++, 1, '2nd called in root')
  })
  fastify.listen({
    host: 'localhost',
    port: 0
  })
})
t.test('***async onListen should be called in order***', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.equal(order++, 0, '1st async called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(order++, 1, '2nd async called in root')
  })

  await fastify.listen({
    host: 'localhost',
    port: 0
  })
})
t.test('Register onListen hook after a plugin inside a plugin', t => {
  t.plan(3)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.ok('called')
      done()
    })
    done()
  }))

  fastify.register(fp(function (instance, opts, done) {
    instance.addHook('onListen', function (done) {
      t.ok('called')
      done()
    })

    instance.addHook('onListen', function (done) {
      t.ok('called')
      done()
    })

    done()
  }))

  fastify.listen({
    host: 'localhost',
    port: 0
  })
})
