'use strict'

const { test, describe } = require('node:test')
const fp = require('fastify-plugin')
const Fastify = require('..')

describe('Application hooks instance reference consistency (#4967)', () => {
  test('all application hooks bind this and pass instance first on root (function declarations)', async t => {
    const fastify = Fastify({ exposeHeadRoutes: false })
    const seen = []

    fastify.addHook('onRoute', function (instance, routeOptions) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      t.assert.strictEqual(routeOptions.url, '/root')
      seen.push('onRoute')
    })

    let registeredChild
    fastify.addHook('onRegister', function (instance, newInstance, opts) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      t.assert.strictEqual(Object.getPrototypeOf(newInstance), fastify)
      t.assert.strictEqual(opts.prefix, '/sub')
      registeredChild = newInstance
      seen.push('onRegister')
    })

    fastify.addHook('onReady', function (instance, done) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onReady:cb')
      done()
    })

    fastify.addHook('onReady', async function (instance) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onReady:async')
    })

    let onListenDoneResolve
    const onListenDone = new Promise(resolve => {
      onListenDoneResolve = resolve
    })

    fastify.addHook('onListen', function (instance, done) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onListen:cb')
      done()
    })

    fastify.addHook('onListen', async function (instance) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onListen:async')
      onListenDoneResolve()
    })

    fastify.addHook('preClose', function (instance, done) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('preClose:cb')
      done()
    })

    fastify.addHook('preClose', async function (instance) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('preClose:async')
    })

    fastify.addHook('onClose', function (instance, done) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onClose:cb')
      done()
    })

    fastify.addHook('onClose', async function (instance) {
      t.assert.strictEqual(this, fastify)
      t.assert.strictEqual(instance, fastify)
      seen.push('onClose:async')
    })

    fastify.get('/root', async () => 'ok')

    fastify.register(async function subPlugin (child) {
      t.assert.strictEqual(child, registeredChild)
    }, { prefix: '/sub' })

    await fastify.listen({ port: 0 })
    await onListenDone
    await fastify.close()

    t.assert.deepStrictEqual(seen, [
      'onRoute',
      'onRegister',
      'onReady:cb',
      'onReady:async',
      'onListen:cb',
      'onListen:async',
      'preClose:cb',
      'preClose:async',
      'onClose:async',
      'onClose:cb'
    ])
  })

  test('all application hooks pass instance first for arrow functions', async t => {
    const fastify = Fastify({ exposeHeadRoutes: false })
    const seen = []

    fastify.addHook('onRoute', (instance, routeOptions) => {
      t.assert.strictEqual(instance, fastify)
      t.assert.strictEqual(routeOptions.url, '/arrow')
      seen.push('onRoute')
    })

    let childRef
    fastify.addHook('onRegister', (instance, newInstance, opts) => {
      t.assert.strictEqual(instance, fastify)
      t.assert.strictEqual(Object.getPrototypeOf(newInstance), fastify)
      t.assert.strictEqual(opts.tag, 'v1')
      childRef = newInstance
      seen.push('onRegister')
    })

    fastify.addHook('onReady', (instance, done) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onReady:cb')
      done()
    })

    fastify.addHook('onReady', async (instance) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onReady:async')
    })

    let onListenDoneResolve
    const onListenDone = new Promise(resolve => {
      onListenDoneResolve = resolve
    })

    fastify.addHook('onListen', (instance, done) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onListen:cb')
      done()
    })

    fastify.addHook('onListen', async (instance) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onListen:async')
      onListenDoneResolve()
    })

    fastify.addHook('preClose', (instance, done) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('preClose:cb')
      done()
    })

    fastify.addHook('preClose', async (instance) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('preClose:async')
    })

    fastify.addHook('onClose', (instance, done) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onClose:cb')
      done()
    })

    fastify.addHook('onClose', async (instance) => {
      t.assert.strictEqual(instance, fastify)
      seen.push('onClose:async')
    })

    fastify.get('/arrow', async () => 'ok')

    fastify.register(async (child) => {
      t.assert.strictEqual(child, childRef)
    }, { tag: 'v1' })

    await fastify.listen({ port: 0 })
    await onListenDone
    await fastify.close()

    t.assert.deepStrictEqual(seen, [
      'onRoute',
      'onRegister',
      'onReady:cb',
      'onReady:async',
      'onListen:cb',
      'onListen:async',
      'preClose:cb',
      'preClose:async',
      'onClose:async',
      'onClose:cb'
    ])
  })

  test('encapsulated child and grandchild plugins receive their own instance', async t => {
    const fastify = Fastify({ exposeHeadRoutes: false })
    const onRegisterCalls = []
    let onListenDoneResolve
    const onListenDone = new Promise(resolve => {
      onListenDoneResolve = resolve
    })

    fastify.addHook('onRegister', function (instance, newInstance, opts) {
      onRegisterCalls.push({
        hookOwner: 'root',
        thisRef: this,
        instance,
        newInstance,
        prefix: opts.prefix
      })
    })

    let capturedChild
    let capturedGrandchild

    fastify.register(async function childPlugin (child) {
      capturedChild = child
      child.decorate('scopeName', 'child')

      child.addHook('onRoute', function (instance, routeOptions) {
        t.assert.strictEqual(this, instance)
        if (routeOptions.url === '/child/ping') {
          t.assert.strictEqual(instance, child)
          t.assert.strictEqual(instance.scopeName, 'child')
        } else if (routeOptions.url === '/child/grand/pong') {
          t.assert.strictEqual(instance, capturedGrandchild)
          t.assert.strictEqual(instance.scopeName, 'grandchild')
        }
      })

      child.addHook('onRegister', function (instance, newInstance, opts) {
        onRegisterCalls.push({
          hookOwner: 'child',
          thisRef: this,
          instance,
          newInstance,
          prefix: opts.prefix
        })
      })

      child.addHook('onReady', (instance, done) => {
        t.assert.strictEqual(instance, child)
        t.assert.strictEqual(instance.scopeName, 'child')
        done()
      })

      child.addHook('onListen', (instance, done) => {
        t.assert.strictEqual(instance, child)
        done()
      })

      child.addHook('preClose', (instance, done) => {
        t.assert.strictEqual(instance, child)
        done()
      })

      child.addHook('onClose', (instance, done) => {
        t.assert.strictEqual(instance, child)
        done()
      })

      child.get('/ping', async () => 'ping')

      child.register(async function grandchildPlugin (grandchild) {
        capturedGrandchild = grandchild
        grandchild.decorate('scopeName', 'grandchild')

        grandchild.addHook('onReady', async (instance) => {
          t.assert.strictEqual(instance, grandchild)
          t.assert.strictEqual(instance.scopeName, 'grandchild')
        })

        grandchild.addHook('onListen', async (instance) => {
          t.assert.strictEqual(instance, grandchild)
          onListenDoneResolve()
        })

        grandchild.addHook('preClose', async (instance) => {
          t.assert.strictEqual(instance, grandchild)
        })

        grandchild.addHook('onClose', async (instance) => {
          t.assert.strictEqual(instance, grandchild)
        })

        grandchild.get('/pong', async () => 'pong')
      }, { prefix: '/grand' })
    }, { prefix: '/child' })

    await fastify.listen({ port: 0 })
    await onListenDone
    await fastify.close()

    t.assert.strictEqual(onRegisterCalls.length, 3)

    // 1. Root hook triggered when childPlugin is registered on fastify
    t.assert.strictEqual(onRegisterCalls[0].hookOwner, 'root')
    t.assert.strictEqual(onRegisterCalls[0].thisRef, fastify)
    t.assert.strictEqual(onRegisterCalls[0].instance, fastify)
    t.assert.strictEqual(onRegisterCalls[0].newInstance, capturedChild)
    t.assert.strictEqual(onRegisterCalls[0].prefix, '/child')

    // 2. Inherited root hook triggered when grandchildPlugin is registered on child
    t.assert.strictEqual(onRegisterCalls[1].hookOwner, 'root')
    t.assert.strictEqual(onRegisterCalls[1].thisRef, capturedChild)
    t.assert.strictEqual(onRegisterCalls[1].instance, capturedChild)
    t.assert.strictEqual(onRegisterCalls[1].newInstance, capturedGrandchild)
    t.assert.strictEqual(onRegisterCalls[1].prefix, '/grand')

    // 3. Child hook triggered when grandchildPlugin is registered on child
    t.assert.strictEqual(onRegisterCalls[2].hookOwner, 'child')
    t.assert.strictEqual(onRegisterCalls[2].thisRef, capturedChild)
    t.assert.strictEqual(onRegisterCalls[2].instance, capturedChild)
    t.assert.strictEqual(onRegisterCalls[2].newInstance, capturedGrandchild)
    t.assert.strictEqual(onRegisterCalls[2].prefix, '/grand')
  })

  test('non-encapsulated fastify-plugin hooks receive parent instance and skip onRegister', async t => {
    const fastify = Fastify({ exposeHeadRoutes: false })
    let onRouteCalls = 0
    let onListenDoneResolve
    const onListenDone = new Promise(resolve => {
      onListenDoneResolve = resolve
    })

    fastify.addHook('onRegister', () => {
      t.assert.fail('onRegister must not fire for fastify-plugin')
    })

    fastify.register(fp(async function sharedPlugin (pluginInstance) {
      t.assert.strictEqual(pluginInstance, fastify)

      pluginInstance.addHook('onRoute', function (instance, routeOptions) {
        onRouteCalls++
        t.assert.strictEqual(this, fastify)
        t.assert.strictEqual(instance, fastify)
        t.assert.strictEqual(routeOptions.url, '/shared')
      })

      pluginInstance.addHook('onReady', function (instance, done) {
        t.assert.strictEqual(this, fastify)
        t.assert.strictEqual(instance, fastify)
        done()
      })

      pluginInstance.addHook('onListen', function (instance) {
        t.assert.strictEqual(this, fastify)
        t.assert.strictEqual(instance, fastify)
        onListenDoneResolve()
      })

      pluginInstance.addHook('preClose', function (instance) {
        t.assert.strictEqual(this, fastify)
        t.assert.strictEqual(instance, fastify)
      })

      pluginInstance.addHook('onClose', function (instance, done) {
        t.assert.strictEqual(this, fastify)
        t.assert.strictEqual(instance, fastify)
        done()
      })

      pluginInstance.get('/shared', async () => 'ok')
    }))

    await fastify.listen({ port: 0 })
    await onListenDone
    await fastify.close()
    t.assert.strictEqual(onRouteCalls, 1)
  })

  test('zero-arg and single-arg sync/async handlers continue to work on lifecycle application hooks', async t => {
    const fastify = Fastify()
    const calls = []
    let onListenDoneResolve
    const onListenDone = new Promise(resolve => {
      onListenDoneResolve = resolve
    })

    fastify.addHook('onReady', () => { calls.push('onReady:sync0') })
    fastify.addHook('onReady', (instance) => {
      t.assert.strictEqual(instance, fastify)
      calls.push('onReady:sync1')
    })
    fastify.addHook('onReady', async () => { calls.push('onReady:async0') })

    fastify.addHook('onListen', () => { calls.push('onListen:sync0') })
    fastify.addHook('onListen', (instance) => {
      t.assert.strictEqual(instance, fastify)
      calls.push('onListen:sync1')
    })
    fastify.addHook('onListen', async () => {
      calls.push('onListen:async0')
      onListenDoneResolve()
    })

    fastify.addHook('preClose', () => { calls.push('preClose:sync0') })
    fastify.addHook('preClose', (instance) => {
      t.assert.strictEqual(instance, fastify)
      calls.push('preClose:sync1')
    })
    fastify.addHook('preClose', async () => { calls.push('preClose:async0') })

    fastify.addHook('onClose', () => { calls.push('onClose:sync0') })
    fastify.addHook('onClose', (instance) => {
      t.assert.strictEqual(instance, fastify)
      calls.push('onClose:sync1')
    })
    fastify.addHook('onClose', async () => { calls.push('onClose:async0') })

    await fastify.listen({ port: 0 })
    await onListenDone
    await fastify.close()

    t.assert.deepStrictEqual(calls, [
      'onReady:sync0',
      'onReady:sync1',
      'onReady:async0',
      'onListen:sync0',
      'onListen:sync1',
      'onListen:async0',
      'preClose:sync0',
      'preClose:sync1',
      'preClose:async0',
      'onClose:async0',
      'onClose:sync1',
      'onClose:sync0'
    ])
  })
})
