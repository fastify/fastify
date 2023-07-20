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

t.test('onListen should manage error in sync', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', function () {
    t.pass('called in root')
  })

  fastify.addHook('onListen', function () {
    t.equal(order++, 0, '1st sync called in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.listen({
    host: 'localhost',
    port: 0
  }
  // we would like to implement this similar to how onReady handles error and checks if the err message matches
  // ,
  // (err) => {
  //   t.ok(err)
  //   t.equal(err.message, 'FAIL ON LISTEN')
  // }
  )
})

t.test('onListen should manage error in async', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  let order = 0

  fastify.addHook('onListen', async function () {
    t.pass('called in root')
  })

  fastify.addHook('onListen', async function () {
    t.equal(order++, 0, '1st async called in root')
    throw new Error('FAIL ON LISTEN')
  })

  fastify.addHook('onListen', async function () {
    t.pass('called in root')
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

t.test('onListen encapsulation should be called in order', t => {
  t.plan(6)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  let order = 0

  fastify.addHook('onListen', function () {
    t.equal(order++, 0, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onListen', function () {
      t.equal(order++, 1, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
    })
    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onListen', async function () {
        t.equal(order++, 2, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })
  fastify.listen({
    host: 'localhost',
    port: 0
  })
})
