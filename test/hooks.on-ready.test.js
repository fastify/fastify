'use strict'

const t = require('tap')
const Fastify = require('../fastify')
const immediate = require('node:util').promisify(setImmediate)

t.test('onReady should be called in order', t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', function (done) {
    t.equal(order++, 0, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.equal(order++, 1, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.equal(order++, 2, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  fastify.ready(err => t.error(err))
})

t.test('onReady should be called once', async (t) => {
  const app = Fastify()
  let counter = 0

  app.addHook('onReady', async function () {
    counter++
  })

  const promises = [1, 2, 3, 4, 5].map((id) => app.ready().then(() => id))

  const result = await Promise.race(promises)

  t.strictSame(result, 1, 'Should resolve in order')
  t.equal(counter, 1, 'Should call onReady only once')
})

t.test('async onReady should be called in order', async t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', async function () {
    await immediate()
    t.equal(order++, 0, 'called in root')
    t.equal(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', async function () {
      await immediate()
      t.equal(order++, 1, 'called in childOne')
      t.equal(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.equal(order++, 2, 'called in childTwo')
        t.equal(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
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
  t.equal(order, 1)

  await fastify.ready()
  t.equal(order, 1, 'ready hooks execute once')
})

t.test('listen and onReady order', async t => {
  t.plan(9)

  const fastify = Fastify()
  let order = 0

  fastify.register((instance, opts, done) => {
    instance.ready(checkOrder.bind(null, 0))
    instance.addHook('onReady', checkOrder.bind(null, 4))

    instance.register((subinstance, opts, done) => {
      subinstance.ready(checkOrder.bind(null, 1))
      subinstance.addHook('onReady', checkOrder.bind(null, 5))

      subinstance.register((realSubInstance, opts, done) => {
        realSubInstance.ready(checkOrder.bind(null, 2))
        realSubInstance.addHook('onReady', checkOrder.bind(null, 6))
        done()
      })
      done()
    })
    done()
  })

  fastify.addHook('onReady', checkOrder.bind(null, 3))

  await fastify.ready()
  t.pass('trigger the onReady')
  await fastify.listen({ port: 0 })
  t.pass('do not trigger the onReady')

  await fastify.close()

  function checkOrder (shouldbe) {
    t.equal(order, shouldbe)
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

    t.equal(order, 0, 'ready and hooks not triggered yet')
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
    t.equal(order, shouldbe)
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
    t.equal(err.message, 'FAIL ON READY')
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
    t.equal(err.message, 'FAIL ON READY')
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
    t.equal(err.message, 'FAIL UNWANTED SYNC EXCEPTION')
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
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    try {
      fastify.addHook('onRequest', (request, reply, done) => {})
    } catch (error) {
      t.ok(error)
      t.equal(error.message, 'Root plugin has already booted')
      // TODO: look where the error pops up
      t.equal(error.code, 'AVV_ERR_PLUGIN_NOT_VALID')
      done(error)
    }
  })

  fastify.addHook('onRequest', (request, reply, done) => {})
  fastify.get('/', async () => 'hello')

  fastify.ready((err) => { t.ok(err) })
})

t.test('onReady throw loading error', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addHook('onReady', async function (done) {})
  } catch (e) {
    t.ok(e.code, 'FST_ERR_HOOK_INVALID_ASYNC_HANDLER')
    t.ok(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
  }
})

t.test('onReady does not call done', t => {
  t.plan(6)
  const fastify = Fastify({ pluginTimeout: 500 })

  fastify.addHook('onReady', function (done) {
    t.pass('called in root')
    // done() // don't call done to test timeout
  })

  fastify.ready(err => {
    t.ok(err)
    t.equal(err.message, "A callback for 'onReady' hook timed out. You may have forgotten to call 'done' function or to resolve a Promise")
    t.equal(err.code, 'FST_ERR_HOOK_TIMEOUT')
    t.ok(err.cause)
    t.equal(err.cause.code, 'AVV_ERR_READY_TIMEOUT')
  })
})

t.test('onReady execution order', t => {
  t.plan(3)
  const fastify = Fastify({ })

  let i = 0
  fastify.ready(() => { i++; t.equal(i, 1) })
  fastify.ready(() => { i++; t.equal(i, 2) })
  fastify.ready(() => { i++; t.equal(i, 3) })
})

t.test('ready return the server with callback', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.ready((err, instance) => {
    t.error(err)
    t.same(instance, fastify)
  })
})

t.test('ready return the server with Promise', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.ready()
    .then(instance => { t.same(instance, fastify) })
    .catch(err => { t.fail(err) })
})

t.test('ready return registered', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((one, opts, done) => {
    one.ready().then(itself => { t.same(itself, one) })
    done()
  })

  fastify.register((two, opts, done) => {
    two.ready().then(itself => { t.same(itself, two) })

    two.register((twoDotOne, opts, done) => {
      twoDotOne.ready().then(itself => { t.same(itself, twoDotOne) })
      done()
    })
    done()
  })

  fastify.ready()
    .then(instance => { t.same(instance, fastify) })
    .catch(err => { t.fail(err) })
})

t.test('do not crash with error in follow up onReady hook', async t => {
  const fastify = Fastify()

  fastify.addHook('onReady', async function () {
  })

  fastify.addHook('onReady', function () {
    throw new Error('kaboom')
  })

  await t.rejects(fastify.ready())
})
