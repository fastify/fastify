'use strict'

const t = require('tap')
const Fastify = require('../fastify')
const immediate = require('util').promisify(setImmediate)

t.test('onReady should be called in order', t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', function (done) {
    t.equals(order++, 0, 'called in root')
    t.equals(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.equals(order++, 1, 'called in childOne')
      t.equals(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.equals(order++, 2, 'called in childTwo')
        t.equals(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  fastify.ready(err => t.error(err))
})

t.test('async onReady should be called in order', async t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', async function () {
    await immediate()
    t.equals(order++, 0, 'called in root')
    t.equals(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', async function () {
      await immediate()
      t.equals(order++, 1, 'called in childOne')
      t.equals(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.equals(order++, 2, 'called in childTwo')
        t.equals(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  await fastify.ready()
  t.pass('ready')
})

t.test('mix ready and onReady', async t => {
  t.plan(2)
  const fastify = Fastify()
  let order = 0

  fastify.addHook('onReady', async function () {
    await immediate()
    order++
  })

  await fastify.ready()
  t.equals(order, 1)

  await fastify.ready()
  t.equals(order, 1, 'ready hooks execute once')
})

t.test('listen and onReady order', async t => {
  t.plan(9)

  const fastify = Fastify()
  let order = 0

  fastify.register((instance, opts, next) => {
    instance.ready(checkOrder.bind(null, 0))
    instance.addHook('onReady', checkOrder.bind(null, 4))

    instance.register((subinstance, opts, next) => {
      subinstance.ready(checkOrder.bind(null, 1))
      subinstance.addHook('onReady', checkOrder.bind(null, 5))

      subinstance.register((realSubInstance, opts, next) => {
        realSubInstance.ready(checkOrder.bind(null, 2))
        realSubInstance.addHook('onReady', checkOrder.bind(null, 6))
        next()
      })
      next()
    })
    next()
  })

  fastify.addHook('onReady', checkOrder.bind(null, 3))

  await fastify.ready()
  t.pass('trigger the onReady')
  await fastify.listen(0)
  t.pass('do not trigger the onReady')

  await fastify.close()

  function checkOrder (shouldbe) {
    t.equals(order, shouldbe)
    order++
  }
})

t.test('multiple ready calls', async t => {
  t.plan(11)

  const fastify = Fastify()
  let order = 0

  fastify.register(async (instance, opts) => {
    instance.ready(checkOrder.bind(null, 1))
    instance.addHook('onReady', checkOrder.bind(null, 6))

    await instance.register(async (subinstance, opts) => {
      subinstance.ready(checkOrder.bind(null, 2))
      subinstance.addHook('onReady', checkOrder.bind(null, 7))
    })

    t.equals(order, 0, 'ready and hooks not triggered yet')
    order++
  })

  fastify.addHook('onReady', checkOrder.bind(null, 3))
  fastify.addHook('onReady', checkOrder.bind(null, 4))
  fastify.addHook('onReady', checkOrder.bind(null, 5))

  await fastify.ready()
  t.pass('trigger the onReady')

  await fastify.ready()
  t.pass('do not trigger the onReady')

  await fastify.ready()
  t.pass('do not trigger the onReady')

  function checkOrder (shouldbe) {
    t.equals(order, shouldbe)
    order++
  }
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

t.test('onReady can not add decorators or application hooks', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    fastify.decorate('test', () => {})

    fastify.addHook('onReady', async function () {
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

t.test('onReady execution order', t => {
  t.plan(3)
  const fastify = Fastify({ })

  let i = 0
  fastify.ready(() => { i++; t.equals(i, 1) })
  fastify.ready(() => { i++; t.equals(i, 2) })
  fastify.ready(() => { i++; t.equals(i, 3) })
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
