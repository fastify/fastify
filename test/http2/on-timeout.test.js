'use strict'

const { test } = require('node:test')
const http2 = require('node:http2')
const { once } = require('node:events')
const Fastify = require('../..')
const { getServerUrl } = require('../helper')

async function connect (t, fastify) {
  await fastify.listen({ port: 0 })
  const session = http2.connect(getServerUrl(fastify))
  t.after(async () => {
    session.close()
    await fastify.close()
  })
  await once(session, 'connect')
  return session
}

function request (session, path) {
  return new Promise((resolve, reject) => {
    const stream = session.request({ ':path': path })
    let status
    let body = ''
    stream.setEncoding('utf8')
    stream.on('response', (headers) => { status = headers[':status'] })
    stream.on('data', (chunk) => { body += chunk })
    stream.on('end', () => resolve({ status, body }))
    stream.on('error', reject)
    stream.end()
  })
}

function hasTimeoutListener (emitter) {
  return emitter.listeners('timeout').some(listener => listener.name === 'handleTimeout')
}

test('onTimeout runs when an HTTP/2 request stream times out', async t => {
  t.plan(3)
  const fastify = Fastify({ http2: true })

  let onTimeoutCalled
  const timedOut = new Promise(resolve => { onTimeoutCalled = resolve })

  fastify.addHook('onTimeout', async (request, reply) => {
    t.assert.strictEqual(request.url, '/')
    t.assert.strictEqual(reply.request, request)
    onTimeoutCalled()
  })

  fastify.get('/', async (request) => {
    request.raw.setTimeout(50)
    await timedOut
    return { ok: true }
  })

  const session = await connect(t, fastify)
  const res = await request(session, '/')
  t.assert.deepStrictEqual(res, { status: 200, body: '{"ok":true}' })
})

test('onTimeout runs for each concurrent request on the same HTTP/2 session', async t => {
  t.plan(2)
  const fastify = Fastify({ http2: true })

  const timedOutUrls = []
  let allTimedOut
  const bothTimedOut = new Promise(resolve => { allTimedOut = resolve })

  fastify.addHook('onTimeout', async (request) => {
    timedOutUrls.push(request.url)
    if (timedOutUrls.length === 2) allTimedOut()
  })

  fastify.get('/:id', async (request) => {
    request.raw.setTimeout(50)
    await bothTimedOut
    return request.params.id
  })

  const session = await connect(t, fastify)
  const results = await Promise.all([request(session, '/a'), request(session, '/b')])

  t.assert.deepStrictEqual(results, [{ status: 200, body: 'a' }, { status: 200, body: 'b' }])
  t.assert.deepStrictEqual(timedOutUrls.sort(), ['/a', '/b'])
})

test('onTimeout state lives on the HTTP/2 stream and is released after the response', async t => {
  t.plan(6)
  const fastify = Fastify({ http2: true })

  fastify.addHook('onTimeout', async () => {})

  fastify.addHook('onResponse', async (request) => {
    const stream = request.raw.stream
    t.assert.strictEqual(stream._meta, null)
    t.assert.strictEqual(hasTimeoutListener(stream), false)
  })

  fastify.get('/', async (request) => {
    const stream = request.raw.stream
    t.assert.strictEqual(stream._meta.request, request)
    t.assert.strictEqual(hasTimeoutListener(stream), true)
    // Nothing is stored on the socket shared by every stream of the session
    t.assert.strictEqual(request.raw.socket._meta, undefined)
    return 'ok'
  })

  const session = await connect(t, fastify)
  const res = await request(session, '/')
  t.assert.deepStrictEqual(res, { status: 200, body: 'ok' })
})

test('reply.hijack() releases onTimeout state from the HTTP/2 stream', async t => {
  t.plan(3)
  const fastify = Fastify({ http2: true })

  fastify.addHook('onTimeout', async () => {})

  let metaAfterHijack
  let listenerAfterHijack
  fastify.get('/', async (request, reply) => {
    reply.hijack()
    const stream = request.raw.stream
    metaAfterHijack = stream._meta
    listenerAfterHijack = hasTimeoutListener(stream)
    reply.raw.writeHead(200, { 'content-type': 'text/plain' })
    reply.raw.end('ok')
    return reply
  })

  const session = await connect(t, fastify)
  const res = await request(session, '/')
  t.assert.deepStrictEqual(res, { status: 200, body: 'ok' })
  t.assert.strictEqual(metaAfterHijack, null)
  t.assert.strictEqual(listenerAfterHijack, false)
})
