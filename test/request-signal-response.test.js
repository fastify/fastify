'use strict'

const { test } = require('node:test')
const { createHook } = require('node:async_hooks')
const { once } = require('node:events')
const { request: httpRequest } = require('node:http')
const { connect, constants } = require('node:http2')
const { setImmediate: immediate, setTimeout: delay } = require('node:timers/promises')
const Fastify = require('..')
const { kRequestSignal, kTimeoutTimer } = require('../lib/symbols')

function trackTimer (t) {
  const ids = new WeakMap()
  const destroyed = new Set()
  let timer
  const hook = createHook({
    init (id, type, triggerId, resource) {
      if (type === 'Timeout') ids.set(resource, id)
    },
    destroy (id) { destroyed.add(id) }
  }).enable()
  t.after(() => { clearTimeout(timer); hook.disable() })
  return {
    capture (request) { timer = request[kTimeoutTimer] },
    async assertDestroyed () {
      const id = ids.get(timer)
      t.assert.strictEqual(typeof id, 'number')
      await immediate()
      t.assert.strictEqual(destroyed.has(id), true)
    }
  }
}

for (const handlerTimeout of [0, 1000]) {
  test(`HTTP/2 reset after large response end cancels ${handlerTimeout ? 'early' : 'late'} signal (timeout ${handlerTimeout})`, { timeout: 5000 }, async t => {
    const app = Fastify({ http2: true, handlerTimeout })
    const timer = trackTimer(t)
    const closed = Promise.withResolvers()
    let capturedRequest
    let signal
    let finishState
    let client = null
    let session = null
    t.after(async () => { client?.destroy(); session?.destroy(); await app.close() })
    app.get('/', (request, reply) => {
      capturedRequest = request
      if (handlerTimeout) {
        signal = request.signal
        timer.capture(request)
      }
      reply.raw.once('finish', () => {
        finishState = { aborted: request.raw.aborted, writableFinished: reply.raw.writableFinished }
      })
      reply.raw.once('close', () => closed.resolve())
      // The body exceeds HTTP/2 flow-control windows, so a paused client cannot
      // consume it before resetting the stream. No native methods are mocked.
      reply.raw.end(Buffer.alloc(16 * 1024 * 1024))
    })
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    session = connect(address)
    client = session.request({ ':path': '/' })
    client.on('error', () => {})
    client.end()
    await once(client, 'response')
    client.pause()
    if (!handlerTimeout) t.assert.strictEqual(capturedRequest[kRequestSignal], undefined)
    const clientClosed = once(client, 'close')
    client.close(constants.NGHTTP2_CANCEL)
    await Promise.all([closed.promise, clientClosed])
    await immediate()
    t.assert.deepStrictEqual(finishState, { aborted: false, writableFinished: false })
    signal ||= capturedRequest.signal
    t.assert.strictEqual(signal.aborted, true)
    t.assert.strictEqual(signal.reason.name, 'AbortError')
    t.assert.strictEqual(capturedRequest.signal, signal)
    if (handlerTimeout) await timer.assertDestroyed()
  })
}

for (const mode of ['HEAD', '204', 'early response']) {
  test(`normal HTTP/2 ${mode} completion does not cancel signal`, { timeout: 5000 }, async t => {
    const app = Fastify({ http2: true })
    const closed = Promise.withResolvers()
    let signal
    let client = null
    let session = null
    t.after(async () => { client?.destroy(); session?.destroy(); await app.close() })
    app.addHook('onRequest', (request, reply, done) => {
      signal = request.signal
      reply.raw.once('close', () => closed.resolve())
      if (mode === 'early response') reply.send('early')
      else done()
    })
    app.route({
      method: mode === 'early response' ? 'POST' : mode === 'HEAD' ? 'HEAD' : 'GET',
      url: '/',
      handler (request, reply) {
        if (mode === '204') reply.code(204).send()
        else reply.raw.end('ok')
      }
    })
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    session = connect(address)
    client = session.request({ ':method': mode === 'early response' ? 'POST' : mode === 'HEAD' ? 'HEAD' : 'GET', ':path': '/' })
    const received = once(client, 'response')
    const ended = once(client, 'end')
    client.resume()
    if (mode !== 'early response') client.end()
    else client.write('unfinished upload')
    const [headers] = await received
    t.assert.strictEqual(headers[':status'], mode === '204' ? 204 : 200)
    await ended
    // Finish the upload normally; an early response must not be confused with
    // the interrupted-upload case tested above.
    if (mode === 'early response') client.end()
    await closed.promise
    await immediate()
    t.assert.strictEqual(signal.aborted, false)
  })
}

test('hijack still destroys a timer installed after incomingRequest ended the response', { timeout: 5000 }, async t => {
  let capturedRequest
  let capturedReply
  const app = Fastify({
    handlerTimeout: 60000,
    logController: new class extends Fastify.LogController {
      incomingRequest (request, reply) {
        capturedRequest = request
        capturedReply = reply
        reply.raw.end('ok')
      }
    }()
  })
  const timer = trackTimer(t)
  t.after(() => app.close())
  app.get('/', () => 'unexpected')
  const res = await app.inject('/')
  t.assert.strictEqual(res.body, 'ok')
  timer.capture(capturedRequest)
  t.assert.ok(capturedRequest[kTimeoutTimer])
  capturedReply.hijack()
  t.assert.strictEqual(capturedRequest[kTimeoutTimer], null)
  await timer.assertDestroyed()
})

test('onRequest hijack followed by first getter before disconnect stays uncanceled', { timeout: 5000 }, async t => {
  const app = Fastify()
  const entered = Promise.withResolvers()
  const closed = Promise.withResolvers()
  let signal
  let client = null
  t.after(async () => { client?.destroy(); await app.close() })
  app.addHook('onRequest', (request, reply, done) => {
    t.assert.strictEqual(request[kRequestSignal], undefined)
    reply.hijack()
    signal = request.signal
    reply.raw.once('close', () => closed.resolve())
    entered.resolve()
  })
  app.get('/', () => 'unexpected')
  const address = await app.listen({ host: '127.0.0.1', port: 0 })
  client = httpRequest(address)
  client.on('error', () => {})
  client.end()
  await entered.promise
  t.assert.strictEqual(signal.aborted, false)
  client.destroy()
  await closed.promise
  await immediate()
  t.assert.strictEqual(signal.aborted, false)
})

for (const first of ['timeout', 'close']) {
  test(`${first} wins the timeout and close race without replacing its reason`, { timeout: 5000 }, async t => {
    const app = Fastify({ handlerTimeout: 40 })
    const timer = trackTimer(t)
    const entered = Promise.withResolvers()
    const timedOut = Promise.withResolvers()
    const closed = Promise.withResolvers()
    let signal
    let client = null
    let timeoutCount = 0
    t.after(async () => { client?.destroy(); await app.close() })
    app.setErrorHandler((error, request, reply) => {
      timeoutCount++
      timedOut.resolve(error)
      // Keep the response open until the test explicitly disconnects.
    })
    app.get('/', (request, reply) => {
      signal = request.signal
      timer.capture(request)
      reply.raw.once('close', () => closed.resolve())
      entered.resolve()
    })
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    client = httpRequest(address)
    client.on('error', () => {})
    client.end()
    await entered.promise
    let reason
    if (first === 'timeout') {
      const error = await timedOut.promise
      reason = signal.reason
      t.assert.strictEqual(reason, error)
      t.assert.strictEqual(reason.code, 'FST_ERR_HANDLER_TIMEOUT')
    }
    client.destroy()
    await closed.promise
    if (first === 'close') {
      reason = signal.reason
      t.assert.strictEqual(reason.name, 'AbortError')
      await delay(80)
      t.assert.strictEqual(timeoutCount, 0)
    } else {
      t.assert.strictEqual(timeoutCount, 1)
    }
    t.assert.strictEqual(signal.reason, reason)
    await timer.assertDestroyed()
  })
}
