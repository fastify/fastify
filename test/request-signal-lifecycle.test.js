'use strict'

const { test } = require('node:test')
const { once } = require('node:events')
const { request: httpRequest } = require('node:http')
const { setImmediate: immediate } = require('node:timers/promises')
const Fastify = require('..')
const { kFourOhFour, kOnAbort, kRequestSignal } = require('../lib/symbols')

for (const event of ['finish', 'close']) {
  test(`frameworkErrors hijack during ${event} invalidates pending cancellation callbacks`, { timeout: 3000 }, async t => {
    let request
    let signal
    let owner
    let finishListeners
    let nativeFinishListeners
    const entered = Promise.withResolvers()
    const closed = Promise.withResolvers()
    const app = Fastify({
      frameworkErrors (error, req, reply) {
        t.assert.strictEqual(error.code, 'FST_ERR_BAD_URL')
        request = req
        owner = req[kOnAbort]
        // Keep the no-controller hijack path covered as well as an existing signal.
        if (event === 'close') signal = req.signal
        finishListeners = reply.raw.listeners('finish').filter(listener => !nativeFinishListeners.has(listener))
        reply.raw.prependOnceListener(event, () => reply.hijack())
        reply.raw.once('close', () => closed.resolve(reply.raw))
        entered.resolve()
        if (event === 'finish') reply.code(400).send('invalid')
      }
    })
    app.server.prependListener('request', (req, res) => { nativeFinishListeners = new Set(res.listeners('finish')) })
    app.get('/:id', () => 'unexpected')
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    const client = httpRequest(address + '/%zz')
    client.on('error', () => {})
    t.after(async () => { client.destroy(); await app.close() })
    const received = event === 'finish' ? once(client, 'response') : null
    client.end()
    await entered.promise
    if (received) {
      const [res] = await received
      res.resume()
      await once(res, 'end')
    } else client.destroy()
    const res = await closed.promise
    await immediate()
    t.assert.strictEqual(typeof owner, 'function')
    t.assert.strictEqual(finishListeners.length, 1)
    t.assert.strictEqual(request[kOnAbort], null)
    t.assert.strictEqual(res.listeners('close').includes(owner), false)
    for (const listener of finishListeners) t.assert.strictEqual(res.listeners('finish').includes(listener), false)
    if (event === 'finish') t.assert.strictEqual(request[kRequestSignal], undefined)
    signal ||= request.signal
    t.assert.strictEqual(signal.aborted, false)
  })
}

test('internal 404 router fallback binds cancellation before incomingRequest', async t => {
  let request
  let response
  let owner
  let signal
  const app = Fastify({
    logController: new class extends Fastify.LogController {
      incomingRequest (req, reply) {
        request = req
        response = reply.raw
        owner = req[kOnAbort]
        signal = req.signal
        t.assert.strictEqual(typeof owner, 'function')
        t.assert.strictEqual(response.listeners('close').includes(owner), true)
      }
    }()
  })
  t.after(() => app.close())
  await app.ready()
  // Deliberately remove the internal wildcard: a normal missing URL otherwise
  // uses routeHandler, never the emergency fourOhFourFallBack constructor.
  app[kFourOhFour].router.reset()
  const res = await app.inject('/missing')
  t.assert.strictEqual(res.statusCode, 404)
  t.assert.strictEqual(res.json().code, 'FST_ERR_NOT_FOUND')
  t.assert.strictEqual(signal.aborted, false)
  t.assert.strictEqual(request[kOnAbort], null)
  t.assert.strictEqual(response.listeners('close').includes(owner), false)
})

test('listener removal can reenter hijack without restarting cancellation', { timeout: 3000 }, async t => {
  const app = Fastify()
  let request
  let reentered = false
  app.addHook('onRequest', async (req, reply) => {
    request = req
    const onFinish = reply.raw.listeners('finish').at(-1)
    reply.raw.on('removeListener', (event, listener) => {
      if (event === 'finish' && listener === onFinish && !reentered) {
        reentered = true
        reply.hijack()
      }
    })
  })
  app.get('/', () => 'ok')
  const address = await app.listen({ host: '127.0.0.1', port: 0 })
  const client = httpRequest(address)
  t.after(async () => { client.destroy(); await app.close() })
  const received = once(client, 'response')
  client.end()
  const [res] = await received
  res.resume()
  await once(res, 'end')
  await immediate()
  t.assert.strictEqual(reentered, true)
  t.assert.strictEqual(request[kOnAbort], null)
  t.assert.strictEqual(request.signal.aborted, false)
})

test('incoming finish listeners retain their order before onResponse and completion logging', async t => {
  const order = []
  let signal
  const app = Fastify({
    logController: new class extends Fastify.LogController {
      incomingRequest (request, reply) {
        signal = request.signal
        reply.raw.once('finish', () => order.push('user finish'))
      }

      requestCompleted () { order.push('request completed') }
    }()
  })
  t.after(() => app.close())
  app.addHook('onResponse', async () => { order.push('onResponse') })
  app.get('/', () => 'ok')
  const res = await app.inject('/')
  await immediate()
  t.assert.strictEqual(res.body, 'ok')
  t.assert.deepStrictEqual(order, ['user finish', 'onResponse', 'request completed'])
  t.assert.strictEqual(signal.aborted, false)
})
