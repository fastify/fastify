'use strict'

const { test } = require('node:test')
const { createHook } = require('node:async_hooks')
const { once } = require('node:events')
const { Agent, request: httpRequest } = require('node:http')
const { connect, constants } = require('node:http2')
const { setImmediate: immediate, setTimeout: delay } = require('node:timers/promises')
const Fastify = require('..')
const { kOnAbort, kRequestSignal, kTimeoutTimer } = require('../lib/symbols')

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

async function server (t, { http2 = false, handlerTimeout = 0 } = {}, handler) {
  const app = Fastify({ http2, handlerTimeout })
  const agent = http2 ? null : new Agent({ keepAlive: true, maxSockets: 1 })
  const clients = new Set()
  let session
  t.after(async () => {
    for (const client of clients) client.destroy()
    session?.destroy()
    agent?.destroy()
    await app.close()
  })
  app.post('/', handler)
  const address = await app.listen({ host: '127.0.0.1', port: 0 })
  if (http2) session = connect(address)
  return {
    send () {
      const headers = { 'content-type': 'application/json' }
      const client = http2
        ? session.request({ ...headers, ':method': 'POST', ':path': '/' })
        : httpRequest(address, { method: 'POST', agent, headers })
      clients.add(client)
      client.on('error', () => {})
      client.end('{}')
      return client
    },
    async disconnect (socket) {
      const closed = once(http2 ? session : socket, 'close')
      session?.destroy()
      agent?.destroy()
      await closed
      await immediate()
    }
  }
}

async function openRequest (t, app, address, http2, path, headers) {
  const session = http2 ? connect(address) : null
  const client = http2
    ? session.request({ ':method': 'POST', ':path': path, ...headers })
    : httpRequest(address + path, { method: 'POST', headers })
  client.on('error', () => {})
  t.after(async () => { client.destroy(); session?.destroy(); await app.close() })
  return client
}

async function response (client, http2) {
  const [received] = await once(client, 'response')
  const body = http2 ? client : received
  body.on('error', () => {})
  return { body, status: http2 ? received[':status'] : received.statusCode }
}

async function consume (body) {
  let data = ''
  body.setEncoding('utf8')
  body.on('data', chunk => { data += chunk })
  await once(body, 'end')
  return data
}

for (const handlerTimeout of [0, 1000]) {
  test(`injected POST keeps its signal uncanceled (timeout ${handlerTimeout})`, async t => {
    const app = Fastify({ handlerTimeout })
    t.after(() => app.close())
    let signal
    app.post('/', request => { signal = request.signal; return 'ok' })
    const res = await app.inject({ method: 'POST', url: '/', payload: {} })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(signal.aborted, false)
  })

  for (const http2 of [false, true]) {
    test(`completed POST stays uncanceled after connection close (HTTP/${http2 ? 2 : 1}, timeout ${handlerTimeout})`, { timeout: 3000 }, async t => {
      const records = []
      const fixture = await server(t, { http2, handlerTimeout }, async (request, reply) => {
        records.push({ signal: request.signal, socket: request.raw.socket, res: reply.raw, owner: request[kOnAbort] })
        await delay(20)
        return { aborted: request.signal.aborted }
      })
      let socket
      for (let index = 0; index < 2; index++) {
        const client = fixture.send()
        const { body, status } = await response(client, http2)
        t.assert.strictEqual(status, 200)
        t.assert.deepStrictEqual(JSON.parse(await consume(body)), { aborted: false })
        if (!http2) {
          if (index === 0) socket = client.socket
          else t.assert.strictEqual(client.socket, socket)
        }
        await immediate()
        t.assert.strictEqual(records[index].res.listeners('close').includes(records[index].owner), false)
      }
      await fixture.disconnect(records[0].socket)
      for (const { signal } of records) t.assert.strictEqual(signal.aborted, false)
    })
  }
}

for (const http2 of [false, true]) {
  for (const late of [false, true]) {
    test(`response disconnect cancels ${late ? 'first late' : 'existing'} signal (HTTP/${http2 ? 2 : 1})`, { timeout: 3000 }, async t => {
      const closed = Promise.withResolvers()
      let captured
      let signal
      const fixture = await server(t, { http2 }, (request, reply) => {
        captured = request
        if (!late) signal = request.signal
        reply.raw.once('close', () => closed.resolve())
        reply.raw.write('first chunk')
      })
      const client = fixture.send()
      const { body, status } = await response(client, http2)
      t.assert.strictEqual(status, 200)
      await once(body, 'data')
      if (late) t.assert.strictEqual(captured[kRequestSignal], undefined)
      else t.assert.strictEqual(signal.aborted, false)
      const clientClosed = once(client, 'close')
      client.destroy()
      await Promise.all([closed.promise, clientClosed])
      await immediate()
      signal ||= captured.signal
      t.assert.strictEqual(signal.aborted, true)
      t.assert.strictEqual(signal.reason.name, 'AbortError')
      t.assert.strictEqual(captured.signal, signal)
      t.assert.strictEqual(captured[kOnAbort], null)
    })
  }
}

test('normal completion creates no controller until the first signal access', async t => {
  const app = Fastify()
  t.after(() => app.close())
  let request
  app.post('/', req => { request = req; return 'ok' })
  await app.inject({ method: 'POST', url: '/', payload: {} })
  t.assert.strictEqual(request[kRequestSignal], undefined)
  const signal = request.signal
  t.assert.strictEqual(signal.aborted, false)
  t.assert.strictEqual(request.signal, signal)
})

test('body completion does not disable the handler timeout or replace its reason', { timeout: 3000 }, async t => {
  let signal
  let request
  const fixture = await server(t, { handlerTimeout: 40 }, async req => {
    request = req
    signal = req.signal
    await delay(150)
    return 'late'
  })
  const { body, status } = await response(fixture.send(), false)
  t.assert.strictEqual(status, 503)
  await consume(body)
  t.assert.strictEqual(signal.reason.code, 'FST_ERR_HANDLER_TIMEOUT')
  t.assert.strictEqual(request[kTimeoutTimer], null)
})

test('disconnect after response end still cancels an unfinished write', { timeout: 3000 }, async t => {
  const app = Fastify()
  const closed = Promise.withResolvers()
  let signal
  let response
  let raw
  let socket
  let write
  let finished = false
  const writes = []
  app.post('/', (request, reply) => {
    signal = request.signal
    raw = request.raw
    response = reply.raw
    socket = response.socket
    write = socket.write
    // Keep real TCP writes, but delay their completion notifications so end()
    // cannot be mistaken for finish on faster sockets or older Node versions.
    socket.write = function (...args) {
      const callback = args.at(-1)
      if (typeof callback === 'function') {
        args[args.length - 1] = (...results) => { writes.push(() => callback(...results)) }
      }
      return Reflect.apply(write, this, args)
    }
    response.once('finish', () => { finished = true })
    response.once('close', () => closed.resolve())
    reply.send(Buffer.alloc(1024 * 1024))
  })
  const address = await app.listen({ host: '127.0.0.1', port: 0 })
  const client = httpRequest(address, { method: 'POST', headers: { 'content-type': 'application/json' } })
  t.after(() => client.destroy())
  t.after(() => {
    if (socket) socket.write = write
    for (const callback of writes) callback()
  })
  t.after(() => app.close())
  const received = once(client, 'response')
  client.end('{}')
  const [res] = await received
  res.on('error', () => {})
  await once(res, 'data')
  client.destroy()
  await closed.promise
  t.assert.strictEqual(raw.aborted, false)
  t.assert.strictEqual(response.writableEnded, true)
  t.assert.strictEqual(finished, false)
  t.assert.strictEqual(signal.aborted, true)
  t.assert.strictEqual(signal.reason.name, 'AbortError')
})

test('signal first accessed after hijack remains unabortable by Fastify', { timeout: 3000 }, async t => {
  const app = Fastify()
  const entered = Promise.withResolvers()
  const observed = Promise.withResolvers()
  let signal
  app.post('/', async (request, reply) => {
    reply.hijack()
    const closed = once(reply.raw, 'close')
    entered.resolve()
    await closed
    signal = request.signal
    observed.resolve()
  })
  const address = await app.listen({ host: '127.0.0.1', port: 0 })
  const client = httpRequest(address, { method: 'POST', headers: { 'content-type': 'application/json' } })
  client.on('error', () => {})
  t.after(() => client.destroy())
  t.after(() => app.close())
  client.end('{}')
  await entered.promise
  client.destroy()
  await observed.promise
  t.assert.strictEqual(signal.aborted, false)
})

test('incoming logger signal receives the original handler timeout reason', async t => {
  let firstSignal
  let handlerSignal
  const app = Fastify({
    handlerTimeout: 20,
    logController: new class extends Fastify.LogController {
      incomingRequest (request) { firstSignal = request.signal }
    }()
  })
  t.after(() => app.close())
  app.get('/', async request => { handlerSignal = request.signal; await delay(60); return 'late' })
  const res = await app.inject('/')
  t.assert.strictEqual(res.statusCode, 503)
  t.assert.strictEqual(firstSignal, handlerSignal)
  t.assert.strictEqual(firstSignal.aborted, true)
  t.assert.strictEqual(firstSignal.reason.code, 'FST_ERR_HANDLER_TIMEOUT')
})

for (const completion of ['finish', 'hijack']) {
  test(`${completion} destroys the original timer and releases cancellation listeners`, { timeout: 3000 }, async t => {
    const app = Fastify({ handlerTimeout: 60000 })
    const timer = trackTimer(t)
    let signal
    let res
    let owner
    t.after(() => app.close())
    app.post('/', async (request, reply) => {
      timer.capture(request)
      signal = request.signal
      res = reply.raw
      owner = request[kOnAbort]
      if (completion === 'hijack') {
        const count = res.listenerCount('finish')
        reply.hijack()
        t.assert.ok(res.listenerCount('finish') < count)
        t.assert.strictEqual(res.listeners('close').includes(owner), false)
        // Verify hijack destroys the timer before the response finishes.
        await timer.assertDestroyed()
        res.end('ok')
      } else return 'ok'
    })
    const received = await app.inject({ method: 'POST', url: '/', payload: {} })
    t.assert.strictEqual(received.statusCode, 200)
    t.assert.strictEqual(received.body, 'ok')
    await timer.assertDestroyed()
    t.assert.strictEqual(signal.aborted, false)
    t.assert.strictEqual(res.listeners('close').includes(owner), false)
  })
}

for (const http2 of [false, true]) {
  for (const handlerTimeout of [0, 1000]) {
    test(`incoming signal receives upload cancellation (HTTP/${http2 ? 2 : 1}, timeout ${handlerTimeout})`, { timeout: 3000 }, async t => {
      const entered = Promise.withResolvers()
      const closed = Promise.withResolvers()
      const timer = trackTimer(t)
      let firstSignal
      let request
      const app = Fastify({
        http2,
        handlerTimeout,
        logController: new class extends Fastify.LogController {
          incomingRequest (req) { firstSignal = req.signal }
        }()
      })
      app.addHook('preParsing', (req, reply, payload, done) => {
        request = req
        if (handlerTimeout) timer.capture(req)
        reply.raw.once('close', () => closed.resolve())
        entered.resolve()
        done(null, payload)
      })
      app.post('/', () => 'unexpected')
      const address = await app.listen({ host: '127.0.0.1', port: 0 })
      const client = await openRequest(t, app, address, http2, '/', { 'content-type': 'application/json', 'content-length': '100' })
      client.write('{')
      await entered.promise
      if (http2) client.close(constants.NGHTTP2_CANCEL)
      else client.destroy()
      await closed.promise
      await immediate()
      t.assert.strictEqual(firstSignal, request.signal)
      t.assert.strictEqual(firstSignal.aborted, true)
      t.assert.strictEqual(firstSignal.reason.name, 'AbortError')
      if (handlerTimeout) await timer.assertDestroyed()
    })
  }

  test(`frameworkErrors normal response keeps signal uncanceled (HTTP/${http2 ? 2 : 1})`, { timeout: 3000 }, async t => {
    let signal
    const app = Fastify({
      http2,
      frameworkErrors (error, request, reply) {
        t.assert.strictEqual(error.code, 'FST_ERR_BAD_URL')
        signal = request.signal
        reply.code(400).send('invalid')
      }
    })
    app.post('/:id', () => 'unexpected')
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    const client = await openRequest(t, app, address, http2, '/%zz', { 'content-type': 'application/json', 'content-length': '2' })
    const received = response(client, http2)
    client.end('{}')
    const { body, status } = await received
    t.assert.strictEqual(status, 400)
    t.assert.strictEqual(await consume(body), 'invalid')
    await immediate()
    t.assert.strictEqual(signal.aborted, false)
  })
}

// Cover all three direct constructors, both getter timings, and HTTP/2 helper use.
for (const { cause, http2, late } of [
  { cause: 'bad URL', http2: false, late: false },
  { cause: 'bad URL', http2: false, late: true },
  { cause: 'bad URL', http2: true, late: true },
  { cause: 'max parameter length', http2: false, late: false },
  { cause: 'async constraint', http2: false, late: true }
]) {
  test(`frameworkErrors cancels ${late ? 'late' : 'early'} signal (${cause}, HTTP/${http2 ? 2 : 1})`, { timeout: 3000 }, async t => {
    const entered = Promise.withResolvers()
    const closed = Promise.withResolvers()
    let request
    let signal
    const routerOptions = { maxParamLength: 5 }
    if (cause === 'async constraint') {
      routerOptions.constraints = {
        secret: {
          name: 'secret',
          storage () {
            const map = new Map()
            return { get: key => map.get(key) || null, set: (key, value) => map.set(key, value) }
          },
          deriveConstraint (req, context, done) { done(new Error('constraint failed')) },
          validate () { return true }
        }
      }
    }
    const app = Fastify({
      http2,
      routerOptions,
      frameworkErrors (error, req, reply) {
        request = req
        if (!late) signal = req.signal
        reply.raw.once('close', () => closed.resolve())
        entered.resolve(error.code)
      }
    })
    app.post('/:id', cause === 'async constraint' ? { constraints: { secret: 'alpha' } } : {}, () => 'unexpected')
    const path = cause === 'bad URL' ? '/%zz' : cause === 'max parameter length' ? '/123456' : '/valid'
    const address = await app.listen({ host: '127.0.0.1', port: 0 })
    const client = await openRequest(t, app, address, http2, path, { 'content-type': 'application/json', 'content-length': '100' })
    client.write('{')
    const code = await entered.promise
    t.assert.strictEqual(code, cause === 'bad URL' ? 'FST_ERR_BAD_URL' : cause === 'max parameter length' ? 'FST_ERR_MAX_PARAM_LENGTH' : 'FST_ERR_ASYNC_CONSTRAINT')
    if (late) t.assert.strictEqual(request[kRequestSignal], undefined)
    client.destroy()
    await closed.promise
    await immediate()
    signal ||= request.signal
    t.assert.strictEqual(signal.aborted, true)
    t.assert.strictEqual(signal.reason.name, 'AbortError')
    t.assert.strictEqual(request.signal, signal)
  })
}
