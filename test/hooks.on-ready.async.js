'use strict'

const Fastify = require('../fastify')
const immediate = require('util').promisify(setImmediate)

module.exports = function asyncTest (t) {
  t.test('async onReady should be called in order', t => {
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

    return fastify.ready().then(() => { t.pass('ready') })
  })

  t.test('mix ready and onReady', t => {
    t.plan(2)
    const fastify = Fastify()
    let order = 0

    fastify.addHook('onReady', async function () {
      await immediate()
      order++
    })

    return fastify.ready()
      .then(() => {
        t.equals(order, 1)
        return fastify.ready()
      })
      .then(() => {
        t.equals(order, 1, 'ready hooks execute once')
      })
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

  t.test('onReady throw loading error', t => {
    t.plan(1)
    const fastify = Fastify()

    try {
      fastify.addHook('onReady', async function (done) {})
    } catch (e) {
      t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
    }
  })
}
