'use strict'

const { test } = require('node:test')
const net = require('node:net')
const http2 = require('node:http2')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { kTimeoutTimer, kOnAbort } = require('../lib/symbols')

// --- Option validation ---

test('server-level handlerTimeout defaults to 0 in initialConfig', t => {
  t.plan(1)
  const fastify = Fastify()
  t.assert.strictEqual(fastify.initialConfig.handlerTimeout, 0)
})

test('server-level handlerTimeout: 5000 is accepted and exposed in initialConfig', t => {
  t.plan(1)
  const fastify = Fastify({ handlerTimeout: 5000 })
  t.assert.strictEqual(fastify.initialConfig.handlerTimeout, 5000)
})

test('route-level handlerTimeout rejects invalid values', async t => {
  const fastify = Fastify()

  t.assert.throws(() => {
    fastify.get('/a', { handlerTimeout: 'fast' }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_HANDLER_TIMEOUT_OPTION_NOT_INT' })

  t.assert.throws(() => {
    fastify.get('/b', { handlerTimeout: -1 }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_HANDLER_TIMEOUT_OPTION_NOT_INT' })

  t.assert.throws(() => {
    fastify.get('/c', { handlerTimeout: 1.5 }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_HANDLER_TIMEOUT_OPTION_NOT_INT' })

  t.assert.throws(() => {
    fastify.get('/d', { handlerTimeout: 0 }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_HANDLER_TIMEOUT_OPTION_NOT_INT' })
})

// --- Lazy signal without handlerTimeout ---

test('when handlerTimeout is 0 (default), request.signal is lazily created', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', async (request) => {
    const signal = request.signal
    t.assert.ok(signal instanceof AbortSignal)
    t.assert.strictEqual(signal.aborted, false)
    return { ok: true }
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
})

test('client disconnect aborts lazily created signal (no handlerTimeout)', async t => {
  t.plan(1)

  const fastify = Fastify()
  let signalAborted = false

  fastify.get('/', async (request) => {
    await new Promise((resolve) => {
      request.signal.addEventListener('abort', () => {
        signalAborted = true
        resolve()
      })
    })
    return 'should not reach'
  })

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const address = fastify.server.address()
  await new Promise((resolve) => {
    const client = net.connect(address.port, () => {
      client.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
      setTimeout(() => {
        client.destroy()
        setTimeout(resolve, 100)
      }, 50)
    })
  })

  t.assert.strictEqual(signalAborted, true)
})

// --- Basic timeout behavior ---

test('slow handler returns 503 with FST_ERR_HANDLER_TIMEOUT', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', { handlerTimeout: 50 }, async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'too late'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 503)
  t.assert.strictEqual(JSON.parse(res.payload).code, 'FST_ERR_HANDLER_TIMEOUT')
})

test('fast handler completes normally with 200', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', { handlerTimeout: 5000 }, async () => {
    return { hello: 'world' }
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
})

// --- Per-route override ---

test('route-level handlerTimeout overrides server default', async t => {
  t.plan(4)
  const fastify = Fastify({ handlerTimeout: 5000 })

  fastify.get('/slow', { handlerTimeout: 50 }, async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'too late'
  })

  fastify.get('/fast', async () => {
    return { ok: true }
  })

  const resSlow = await fastify.inject({ method: 'GET', url: '/slow' })
  t.assert.strictEqual(resSlow.statusCode, 503)
  t.assert.strictEqual(JSON.parse(resSlow.payload).code, 'FST_ERR_HANDLER_TIMEOUT')

  const resFast = await fastify.inject({ method: 'GET', url: '/fast' })
  t.assert.strictEqual(resFast.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(resFast.payload), { ok: true })
})

// --- request.signal behavior ---

test('request.signal is an AbortSignal when handlerTimeout > 0', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', { handlerTimeout: 5000 }, async (request) => {
    t.assert.ok(request.signal instanceof AbortSignal)
    t.assert.strictEqual(request.signal.aborted, false)
    return 'ok'
  })

  await fastify.inject({ method: 'GET', url: '/' })
})

test('request.signal aborts when timeout fires with reason', async t => {
  t.plan(2)
  const fastify = Fastify()

  let signalReason = null
  fastify.get('/', { handlerTimeout: 50 }, async (request) => {
    request.signal.addEventListener('abort', () => {
      signalReason = request.signal.reason
    })
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'too late'
  })

  await fastify.inject({ method: 'GET', url: '/' })
  t.assert.ok(signalReason !== null)
  t.assert.strictEqual(signalReason.code, 'FST_ERR_HANDLER_TIMEOUT')
})

// --- Streaming response ---

test('streaming response: timer clears when response finishes', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.get('/', { handlerTimeout: 5000 }, async (request, reply) => {
    const stream = new Readable({
      read () {
        this.push('hello')
        this.push(null)
      }
    })
    reply.type('text/plain').send(stream)
    return reply
  })

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const address = fastify.server.address()
  const res = await fetch(`http://localhost:${address.port}/`)
  t.assert.strictEqual(res.status, 200)
})

// Regression test for GHSA-3qgw-9275-xf8w:
// a streaming response that has already transmitted its headers must not
// crash the server when handlerTimeout expires. Instead of trying to send
// an error response (which would raise an uncaught ERR_HTTP_HEADERS_SENT),
// the in-flight response is aborted and the server stays alive.
test('streaming response exceeding handlerTimeout aborts instead of crashing', async t => {
  t.plan(4)

  const fastify = Fastify({ handlerTimeout: 100 })

  // A logical gate (a deferred promise) keeps the stream open. The gateway
  // is only released during teardown, so the stream never ends on its own
  // and the handlerTimeout is what terminates the response. Relying on a
  // wall-clock setTimeout to control the stream would be flaky (it can fire
  // after the stream has already been destroyed).
  let release
  const gate = new Promise((resolve) => { release = resolve })

  fastify.get('/stream', async (request, reply) => {
    let started = false
    const stream = new Readable({
      read () {
        if (started) return
        started = true
        // Emit one chunk so the response headers are transmitted before the
        // handler timeout fires, then hold the stream open on the gate until
        // the timeout aborts the response.
        this.push('first')
        gate.then(() => {
          if (!this.destroyed) this.push(null)
        })
      }
    })
    reply.type('text/plain').send(stream)
    return reply
  })

  fastify.get('/after', async () => ({ ok: true }))

  await fastify.listen({ port: 0 })
  t.after(async () => {
    release()
    await fastify.close()
  })

  const base = `http://127.0.0.1:${fastify.server.address().port}`

  // Headers and the first chunk are transmitted before the timeout expires, so
  // the client observes a 200, but the body is aborted when the timeout fires.
  const res = await fetch(`${base}/stream`)
  t.assert.strictEqual(res.status, 200)
  t.assert.strictEqual(res.headers.get('content-type'), 'text/plain')
  await t.assert.rejects(() => res.text())

  // The server must not have crashed and must still serve other requests.
  const after = await fetch(`${base}/after`)
  t.assert.strictEqual(after.status, 200)
})

// Over HTTP/2, payloads larger than 64 KiB are written in chunks and the
// response is ended only after the last one. A client that never reads the
// body keeps the response open with its headers already sent.
test('HTTP/2 payload still being written when handlerTimeout fires aborts instead of crashing', async t => {
  t.plan(2)

  const fastify = Fastify({ http2: true, handlerTimeout: 100 })
  const big = Buffer.alloc(4 * 1024 * 1024, 'a')

  fastify.get('/big', async (request, reply) => {
    reply.type('text/plain')
    return big
  })

  fastify.get('/after', async () => 'ok')

  await fastify.listen({ port: 0 })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(async () => {
    client.destroy()
    await fastify.close()
  })

  await new Promise((resolve) => {
    const req = client.request({ ':path': '/big' })
    req.on('response', (headers) => {
      t.assert.strictEqual(headers[':status'], 200)
      // Never read the body, so the flow-control window is never replenished.
      req.pause()
    })
    req.on('error', () => {})
    req.on('close', resolve)
    req.end()
  })

  // The server must not have crashed and must still serve other requests.
  const body = await new Promise((resolve, reject) => {
    const req = client.request({ ':path': '/after' })
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
    req.end()
  })
  t.assert.strictEqual(body, 'ok')
})

// Regression test for GHSA-3qgw-9275-xf8w:
// aborting request.signal on timeout runs any application abort listener
// synchronously. If that listener sends the response itself, the timeout path
// must not then destroy it: doing so resets the keep-alive connection (and any
// other in-flight requests on it). The connection must stay usable afterwards.
test('handlerTimeout keeps the connection usable when an abort listener sends the response', async t => {
  t.plan(2)

  const fastify = Fastify({ handlerTimeout: 100 })

  // A deferred gate keeps the handler pending so the timeout is what ends the
  // request, while the abort listener sends a complete 504 response.
  let release
  const gate = new Promise((resolve) => { release = resolve })

  fastify.get('/timeout', async (request, reply) => {
    request.signal.addEventListener('abort', () => {
      reply.code(504).type('text/plain').send('handled by abort listener')
    })
    await gate
  })
  fastify.get('/after', async () => 'ok')

  await fastify.listen({ port: 0 })
  t.after(async () => {
    release()
    await fastify.close()
  })

  const socket = net.connect(fastify.server.address().port, '127.0.0.1')
  t.after(() => socket.destroy())

  const second = await new Promise((resolve, reject) => {
    let buffer = ''
    let reused = false
    socket.setEncoding('utf8')
    socket.on('connect', () => {
      socket.write('GET /timeout HTTP/1.1\r\nHost: localhost\r\nConnection: keep-alive\r\n\r\n')
    })
    socket.on('data', (chunk) => {
      buffer += chunk
      if (!reused && buffer.includes('handled by abort listener')) {
        // The abort listener's response arrived; reuse the same socket.
        reused = true
        buffer = ''
        socket.write('GET /after HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n')
      } else if (reused && buffer.includes('ok')) {
        resolve(buffer)
      }
    })
    socket.on('error', reject)
    // Without the fix the server destroys the socket after the first response,
    // so the follow-up request never completes.
    socket.on('close', () => reject(new Error('connection was reset before the follow-up request completed')))
  })

  t.assert.strictEqual(second.startsWith('HTTP/1.1 200'), true)
  t.assert.strictEqual(second.includes('ok'), true)
})

// A response can be ended (reply.sent === true) while its body is still being
// flushed to a slow client, so 'finish' has not fired and the timer is still
// pending. When it fires it must leave the response and request.signal alone.
// 'finish' is held back explicitly so the test does not depend on how much
// data the OS socket buffers absorb.
test('handlerTimeout firing after the reply ended but before it finished is a no-op', async t => {
  t.plan(4)

  const fastify = Fastify({ handlerTimeout: 50 })

  let signal
  fastify.get('/', async (request, reply) => {
    signal = request.signal
    const res = reply.raw
    const emit = res.emit
    res.emit = function (event, ...args) {
      if (event !== 'finish') return emit.call(this, event, ...args)
      // Emit 'finish' only well after the handlerTimeout has fired.
      setTimeout(() => {
        t.assert.strictEqual(reply.sent, true)
        t.assert.strictEqual(signal.aborted, false)
        emit.call(this, event, ...args)
      }, 200)
      return true
    }
    return 'ok'
  })

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  // A raw keep-alive connection, so nothing but the timer can abort the
  // request while 'finish' is pending.
  const socket = net.connect(fastify.server.address().port, '127.0.0.1')
  t.after(() => socket.destroy())

  const response = await new Promise((resolve, reject) => {
    let buffer = ''
    socket.setEncoding('utf8')
    socket.on('connect', () => {
      socket.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
    })
    socket.on('data', (chunk) => {
      buffer += chunk
      if (buffer.endsWith('ok')) resolve(buffer)
    })
    socket.on('error', reject)
  })
  t.assert.strictEqual(response.startsWith('HTTP/1.1 200'), true)

  // Wait for the deferred 'finish', then the request must still not be aborted.
  await new Promise((resolve) => setTimeout(resolve, 300))
  t.assert.strictEqual(signal.aborted, false)
})

// --- SSE with reply.hijack() ---

test('reply.hijack() clears timeout timer', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.get('/', { handlerTimeout: 100 }, async (request, reply) => {
    reply.hijack()
    // Write after the original timeout would have fired
    await new Promise(resolve => setTimeout(resolve, 200))
    reply.raw.writeHead(200, { 'Content-Type': 'text/plain' })
    reply.raw.end('hijacked response')
  })

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const address = fastify.server.address()
  const res = await fetch(`http://localhost:${address.port}/`)
  t.assert.strictEqual(res.status, 200)
})

// --- Error handler integration ---

test('route-level errorHandler receives FST_ERR_HANDLER_TIMEOUT', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', {
    handlerTimeout: 50,
    errorHandler: (error, request, reply) => {
      t.assert.strictEqual(error.code, 'FST_ERR_HANDLER_TIMEOUT')
      reply.code(504).send({ custom: 'timeout' })
    }
  }, async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'too late'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 504)
  t.assert.deepStrictEqual(JSON.parse(res.payload), { custom: 'timeout' })
})

// --- Timer cleanup / no leaks ---

test('timer is cleaned up after fast response (no leak)', async t => {
  t.plan(3)
  const fastify = Fastify()

  let capturedRequest
  fastify.get('/', { handlerTimeout: 60000 }, async (request) => {
    capturedRequest = request
    return 'fast'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
  // Timer and listener should be cleaned up
  t.assert.strictEqual(capturedRequest[kTimeoutTimer], null)
  t.assert.strictEqual(capturedRequest[kOnAbort], null)
})

// --- routeOptions exposure ---

test('request.routeOptions.handlerTimeout reflects configured value', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', { handlerTimeout: 3000 }, async (request) => {
    t.assert.strictEqual(request.routeOptions.handlerTimeout, 3000)
    return 'ok'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
})

test('request.routeOptions.handlerTimeout reflects server default', async t => {
  t.plan(2)
  const fastify = Fastify({ handlerTimeout: 7000 })

  fastify.get('/', async (request) => {
    t.assert.strictEqual(request.routeOptions.handlerTimeout, 7000)
    return 'ok'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 200)
})

// --- Client disconnect aborts signal ---

test('client disconnect aborts request.signal', async t => {
  t.plan(1)

  const fastify = Fastify()
  let signalAborted = false

  fastify.get('/', { handlerTimeout: 5000 }, async (request) => {
    await new Promise((resolve) => {
      request.signal.addEventListener('abort', () => {
        signalAborted = true
        resolve()
      })
    })
    return 'should not reach'
  })

  await fastify.listen({ port: 0 })
  t.after(() => fastify.close())

  const address = fastify.server.address()
  await new Promise((resolve) => {
    const client = net.connect(address.port, () => {
      client.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n')
      setTimeout(() => {
        client.destroy()
        // Give the server time to process the close event
        setTimeout(resolve, 100)
      }, 50)
    })
  })

  t.assert.strictEqual(signalAborted, true)
})

// --- Race: handler completes just as timeout fires ---

test('no double-send when handler completes near timeout boundary', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', { handlerTimeout: 50 }, async (request, reply) => {
    // Respond just before timeout
    await new Promise(resolve => setTimeout(resolve, 40))
    reply.send({ ok: true })
    return reply
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  // Should get either 200 or 503 depending on race, but never crash
  t.assert.ok(res.statusCode === 200 || res.statusCode === 503)
  // Verify response is valid JSON regardless of which won the race
  t.assert.ok(JSON.parse(res.payload))
})

// --- Server default inherited by routes ---

test('routes inherit server-level handlerTimeout', async t => {
  t.plan(3)
  const fastify = Fastify({ handlerTimeout: 50 })

  fastify.get('/', async (request) => {
    // Verify the signal is present (inherited from server default)
    t.assert.ok(request.signal instanceof AbortSignal)
    await new Promise(resolve => setTimeout(resolve, 500))
    return 'too late'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 503)
  t.assert.strictEqual(JSON.parse(res.payload).code, 'FST_ERR_HANDLER_TIMEOUT')
})
