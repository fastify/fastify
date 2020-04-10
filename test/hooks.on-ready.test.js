'use strict'

const t = require('tap')
const Fastify = require('../fastify')
const wait = require('util').promisify(setTimeout)

t.test('onReady should be called', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    t.equals(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.pass('called in childOne')
      t.equals(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await wait(100)
        t.pass('async called in childTwo')
        t.equals(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  fastify.ready(err => t.error(err))
})

t.test('onReady should manage error in sync', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.pass('called in childOne')
      done(new Error('FAIL ON READY'))
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.ok(err)
    t.equals(err.message, 'FAIL ON READY')
  })
})

t.test('onReady should manage error in async', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', async function () {
      t.pass('called in childOne')
      throw new Error('FAIL ON READY')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.ok(err)
    t.equals(err.message, 'FAIL ON READY')
  })
})

t.test('onReady should manage sync error', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.pass('called in childOne')
      throw new Error('FAIL UNWANTED SYNC EXCEPTION')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.ok(err)
    t.equals(err.message, 'FAIL UNWANTED SYNC EXCEPTION')
  })
})

t.test('onReady can add decorators or application hooks', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    fastify.addHook('onReady', async function () {
      t.pass('called in root')
    })
    done()
  })

  fastify.ready(err => { t.error(err) })
})

t.test('onReady cannot add lifecycle hooks', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    try {
      fastify.addHook('onRequest', (request, reply, done) => {})
    } catch (error) {
      t.ok(error)
      t.equals(error.message, 'root plugin has already booted')
      done(error)
    }
  })

  fastify.addHook('onRequest', (request, reply, done) => {})
  fastify.get('/', async () => 'hello')

  fastify.ready((err) => { t.ok(err) })
})

t.test('onReady throw loading error', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addHook('onReady', async function (done) {})
  } catch (e) {
    t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
  }
})

t.test('onReady does not call done', { skip: true }, t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    // done()
  })

  fastify.ready(err => {
    t.ok(err)
    t.equal(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})
