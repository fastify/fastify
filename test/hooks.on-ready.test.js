'use strict'

const semver = require('semver')
const t = require('tap')
const Fastify = require('../fastify')

if (semver.gt(process.versions.node, '8.0.0')) {
  require('./hooks.on-ready.async')(t)
} else {
  t.test('async tests', t => {
    t.plan(1)
    t.pass('Skip because Node version < 8')
  })
}

t.test('onReady should be called in order', t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', function (done) {
    t.equals(order++, 0, 'called in root')
    t.equals(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register((childOne, o, next) => {
    childOne.addHook('onReady', function (done) {
      t.equals(order++, 1, 'called in childOne')
      t.equals(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })

    childOne.register((childTwo, o, next) => {
      childTwo.addHook('onReady', function () {
        return new Promise((resolve) => {
          setTimeout(resolve, 0)
        })
          .then(() => {
            t.equals(order++, 2, 'called in childTwo')
            t.equals(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
          })
      })
      next()
    })
    next()
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

  fastify.register((childOne, o, next) => {
    childOne.addHook('onReady', function (done) {
      t.pass('called in childOne')
      done(new Error('FAIL ON READY'))
    })

    childOne.register((childTwo, o, next) => {
      childTwo.addHook('onReady', function () {
        return Promise().resolve()
          .then(() => {
            t.fail('should not be called')
          })
      })
      next()
    })

    next()
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

  fastify.register((childOne, o, next) => {
    childOne.addHook('onReady', function (done) {
      t.pass('called in childOne')
      throw new Error('FAIL UNWANTED SYNC EXCEPTION')
    })

    childOne.register((childTwo, o, next) => {
      childTwo.addHook('onReady', function () {
        t.fail('should not be called')
      })
      next()
    })

    next()
  })

  fastify.ready(err => {
    t.ok(err)
    t.equals(err.message, 'FAIL UNWANTED SYNC EXCEPTION')
  })
})

t.test('onReady can not add decorators or application hooks', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    fastify.decorate('test', () => {})

    fastify.addHook('onReady', function () {
      t.fail('it will be not called')
    })
    done()
  })

  fastify.addHook('onReady', function (done) {
    t.ok(this.hasDecorator('test'))
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
  fastify.get('/', (r, reply) => reply.send('hello'))

  fastify.ready((err) => { t.ok(err) })
})

t.test('onReady does not call done', t => {
  t.plan(3)
  const fastify = Fastify({ pluginTimeout: 500 })

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    // done() // don't call done to test timeout
  })

  fastify.ready(err => {
    t.ok(err)
    t.equal(err.code, 'ERR_AVVIO_READY_TIMEOUT')
  })
})

t.test('ready chain order when no await', t => {
  t.plan(3)
  const fastify = Fastify({ })

  let i = 0
  fastify.ready(() => {
    i++
    t.equals(i, 1)
  })
  fastify.ready(() => {
    i++
    t.equals(i, 2)
  })
  fastify.ready(() => {
    i++
    t.equals(i, 3)
  })
})

t.test('ready return the server with callback', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.ready((err, instance) => {
    t.error(err)
    t.deepEquals(instance, fastify)
  })
})

t.test('ready return the server with Promise', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.ready()
    .then(instance => { t.deepEquals(instance, fastify) })
    .catch(err => { t.fail(err) })
})

t.test('ready return registered', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((one, opts, next) => {
    one.ready().then(itself => { t.deepEquals(itself, one) })
    next()
  })

  fastify.register((two, opts, next) => {
    two.ready().then(itself => { t.deepEquals(itself, two) })

    two.register((twoDotOne, opts, next) => {
      twoDotOne.ready().then(itself => { t.deepEquals(itself, twoDotOne) })
      next()
    })
    next()
  })

  fastify.ready()
    .then(instance => { t.deepEquals(instance, fastify) })
    .catch(err => { t.fail(err) })
})
