'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')
const immediate = require('node:util').promisify(setImmediate)

test('onReady should be called in order', (t, done) => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', function (done) {
    t.assert.strictEqual(order++, 0, 'called in root')
    t.assert.strictEqual(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.assert.strictEqual(order++, 1, 'called in childOne')
      t.assert.strictEqual(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
      done()
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.assert.strictEqual(order++, 2, 'called in childTwo')
        t.assert.strictEqual(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  fastify.ready(err => {
    t.assert.ifError(err)
    done()
  })
})

test('onReady should be called once', async (t) => {
  const app = Fastify()
  let counter = 0

  app.addHook('onReady', async function () {
    counter++
  })

  const promises = [1, 2, 3, 4, 5].map((id) => app.ready().then(() => id))

  const result = await Promise.race(promises)

  t.assert.strictEqual(result, 1, 'Should resolve in order')
  t.assert.strictEqual(counter, 1, 'Should call onReady only once')
})

test('async onReady should be called in order', async t => {
  t.plan(7)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onReady', async function () {
    await immediate()
    t.assert.strictEqual(order++, 0, 'called in root')
    t.assert.strictEqual(this.pluginName, fastify.pluginName, 'the this binding is the right instance')
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', async function () {
      await immediate()
      t.assert.strictEqual(order++, 1, 'called in childOne')
      t.assert.strictEqual(this.pluginName, childOne.pluginName, 'the this binding is the right instance')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        await immediate()
        t.assert.strictEqual(order++, 2, 'called in childTwo')
        t.assert.strictEqual(this.pluginName, childTwo.pluginName, 'the this binding is the right instance')
      })
    })
  })

  await fastify.ready()
  t.assert.ok('ready')
})

test('mix ready and onReady', async t => {
  t.plan(2)
  const fastify = Fastify()
  let order = 0

  fastify.addHook('onReady', async function () {
    await immediate()
    order++
  })

  await fastify.ready()
  t.assert.strictEqual(order, 1)

  await fastify.ready()
  t.assert.strictEqual(order, 1, 'ready hooks execute once')
})

test('listen and onReady order', async t => {
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
  t.assert.ok('trigger the onReady')
  await fastify.listen({ port: 0 })
  t.assert.ok('do not trigger the onReady')

  await fastify.close()

  function checkOrder (shouldbe) {
    t.assert.strictEqual(order, shouldbe)
    order++
  }
})

test('multiple ready calls', async t => {
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

    t.assert.strictEqual(order, 0, 'ready and hooks not triggered yet')
    order++
  })

  fastify.addHook('onReady', checkOrder.bind(null, 3))
  fastify.addHook('onReady', checkOrder.bind(null, 4))
  fastify.addHook('onReady', checkOrder.bind(null, 5))

  await fastify.ready()
  t.assert.ok('trigger the onReady')

  await fastify.ready()
  t.assert.ok('do not trigger the onReady')

  await fastify.ready()
  t.assert.ok('do not trigger the onReady')

  function checkOrder (shouldbe) {
    t.assert.strictEqual(order, shouldbe)
    order++
  }
})

test('onReady should manage error in sync', (t, done) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.assert.ok('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.assert.ok('called in childOne')
      done(new Error('FAIL ON READY'))
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.assert.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.assert.ok(err)
    t.assert.strictEqual(err.message, 'FAIL ON READY')
    done()
  })
})

test('onReady should manage error in async', (t, done) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.assert.ok('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', async function () {
      t.assert.ok('called in childOne')
      throw new Error('FAIL ON READY')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.assert.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.assert.ok(err)
    t.assert.strictEqual(err.message, 'FAIL ON READY')
    done()
  })
})

test('onReady should manage sync error', (t, done) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.assert.ok('called in root')
    done()
  })

  fastify.register(async (childOne, o) => {
    childOne.addHook('onReady', function (done) {
      t.assert.ok('called in childOne')
      throw new Error('FAIL UNWANTED SYNC EXCEPTION')
    })

    childOne.register(async (childTwo, o) => {
      childTwo.addHook('onReady', async function () {
        t.assert.fail('should not be called')
      })
    })
  })

  fastify.ready(err => {
    t.assert.ok(err)
    t.assert.strictEqual(err.message, 'FAIL UNWANTED SYNC EXCEPTION')
    done()
  })
})

test('onReady can not add decorators or application hooks', (t, done) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.assert.ok('called in root')
    fastify.decorate('test', () => {})

    fastify.addHook('onReady', async function () {
      t.assert.fail('it will be not called')
    })
    done()
  })

  fastify.addHook('onReady', function (done) {
    t.assert.ok(this.hasDecorator('test'))
    done()
  })

  fastify.ready(err => {
    t.assert.ifError(err)
    done()
  })
})

test('onReady cannot add lifecycle hooks', (t, done) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onReady', function (done) {
    t.assert.ok('called in root')
    try {
      fastify.addHook('onRequest', (request, reply, done) => {})
    } catch (error) {
      t.assert.ok(error)
      t.assert.strictEqual(error.message, 'Root plugin has already booted')
      // TODO: look where the error pops up
      t.assert.strictEqual(error.code, 'AVV_ERR_ROOT_PLG_BOOTED')
      done(error)
    }
  })

  fastify.addHook('onRequest', (request, reply, done) => {})
  fastify.get('/', async () => 'hello')

  fastify.ready((err) => {
    t.assert.ok(err)
    done()
  })
})

test('onReady throw loading error', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addHook('onReady', async function (done) {})
  } catch (e) {
    t.assert.strictEqual(e.code, 'FST_ERR_HOOK_INVALID_ASYNC_HANDLER')
    t.assert.ok(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
  }
})

test('onReady does not call done', (t, done) => {
  t.plan(6)
  const fastify = Fastify({ pluginTimeout: 500 })

  fastify.addHook('onReady', function someHookName (done) {
    t.assert.ok('called in root')
    // done() // don't call done to test timeout
  })

  fastify.ready(err => {
    t.assert.ok(err)
    t.assert.strictEqual(err.message, 'A callback for \'onReady\' hook "someHookName" timed out. You may have forgotten to call \'done\' function or to resolve a Promise')
    t.assert.strictEqual(err.code, 'FST_ERR_HOOK_TIMEOUT')
    t.assert.ok(err.cause)
    t.assert.strictEqual(err.cause.code, 'AVV_ERR_READY_TIMEOUT')
    done()
  })
})

test('onReady execution order', (t, done) => {
  t.plan(3)
  const fastify = Fastify({ })

  let i = 0
  fastify.ready(() => { i++; t.assert.strictEqual(i, 1) })
  fastify.ready(() => { i++; t.assert.strictEqual(i, 2) })
  fastify.ready(() => {
    i++
    t.assert.strictEqual(i, 3)
    done()
  })
})

test('ready return the server with callback', (t, done) => {
  t.plan(2)
  const fastify = Fastify()

  fastify.ready((err, instance) => {
    t.assert.ifError(err)
    t.assert.deepStrictEqual(instance, fastify)
    done()
  })
})

test('ready return the server with Promise', async t => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.ready()
    .then(instance => { t.assert.deepStrictEqual(instance, fastify) })
    .catch(err => { t.assert.fail(err) })
})

test('ready return registered', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register((one, opts, done) => {
    one.ready().then(itself => { t.assert.deepStrictEqual(itself, one) })
    done()
  })

  fastify.register((two, opts, done) => {
    two.ready().then(itself => { t.assert.deepStrictEqual(itself, two) })

    two.register((twoDotOne, opts, done) => {
      twoDotOne.ready().then(itself => { t.assert.deepStrictEqual(itself, twoDotOne) })
      done()
    })
    done()
  })

  await fastify.ready()
    .then(instance => { t.assert.deepStrictEqual(instance, fastify) })
    .catch(err => { t.assert.fail(err) })
})

test('do not crash with error in follow up onReady hook', async t => {
  const fastify = Fastify()

  fastify.addHook('onReady', async function () {
  })

  fastify.addHook('onReady', function () {
    throw new Error('kaboom')
  })

  await t.assert.rejects(fastify.ready())
})

test('hooks, routes and decorators cannot be added once ready() has resolved', async t => {
  t.plan(6)
  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.ready()

  t.assert.throws(() => fastify.addHook('onClose', async () => {}), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  t.assert.throws(() => fastify.addHook('preClose', async () => {}), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  t.assert.throws(() => fastify.decorate('late', true), { code: 'FST_ERR_DEC_AFTER_START' })
  t.assert.throws(
    () => fastify.addContentTypeParser('text/late', (req, body, done) => done(null, body)),
    { code: 'FST_ERR_CTP_INSTANCE_ALREADY_STARTED' }
  )
  t.assert.throws(() => fastify.get('/late', () => 'late'), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })

  // the rejected route must not be left half-registered in the router
  const res = await fastify.inject('/late')
  t.assert.strictEqual(res.statusCode, 404)
})

test('hooks, routes and decorators cannot be added from the ready() callback', (t, done) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.ready(err => {
    t.assert.ifError(err)
    t.assert.throws(() => fastify.addHook('onClose', async () => {}), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
    t.assert.throws(() => fastify.decorate('late', true), { code: 'FST_ERR_DEC_AFTER_START' })
    t.assert.throws(() => fastify.get('/late', () => 'late'), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
    fastify.close(done)
  })
})

test('onReady cannot add onClose hooks', async t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addHook('onReady', async function () {
    // it would run before the server stops listening, while requests are still in flight
    this.addHook('onClose', async () => {
      t.assert.fail('should not be registered')
    })
  })

  await t.assert.rejects(fastify.ready(), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
  await fastify.close()
})

test('onReady cannot add routes, and they are not left in the router', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addHook('onReady', function (done) {
    t.assert.throws(() => this.get('/late', () => 'late'), { code: 'FST_ERR_INSTANCE_ALREADY_STARTED' })
    done()
  })

  await fastify.ready()

  const res = await fastify.inject('/late')
  t.assert.strictEqual(res.statusCode, 404)
})
