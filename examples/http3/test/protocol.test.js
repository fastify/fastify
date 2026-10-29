'use strict'

const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')
const { Readable } = require('node:stream')
const http2 = require('node:http2')
const https = require('node:https')
const Fastify = require('../../..')
const { connectAsync } = require('@currentspace/http3')
const { createNodeServerFactory } = require('@currentspace/http3/node')

let directory
let tls
before(() => {
  directory = mkdtempSync(join(tmpdir(), 'fastify-http3-'))
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'),
    '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' })
  tls = { key: readFileSync(join(directory, 'key.pem')), cert: readFileSync(join(directory, 'cert.pem')) }
})
after(() => rmSync(directory, { recursive: true, force: true }))

async function start (t, configure, options = {}) {
  const app = Fastify({ https: tls, serverFactory: createNodeServerFactory({ ...tls, runtimeMode: 'portable', ...options }), bodyLimit: 1024 })
  t.after(() => app.close())
  await configure(app)
  await app.listen({ port: 0, host: '127.0.0.1' })
  return app
}

async function client (t, app, protocol = 'h3') {
  const authority = `https://127.0.0.1:${app.server.address().port}`
  const session = protocol === 'h3'
    ? await connectAsync(authority, { ca: tls.cert, servername: 'localhost' })
    : http2.connect(authority, { ca: tls.cert })
  if (protocol === 'h2') await once(session, 'connect')
  t.after(async () => {
    if (protocol === 'h3') await session.close()
    else session.destroy()
  })
  return session
}

async function request (session, path, { method = 'GET', body, headers = {} } = {}) {
  const stream = session.request({ ':method': method, ':path': path, ':authority': 'localhost', ':scheme': 'https', ...headers }, { endStream: body === undefined })
  const response = once(stream, 'response')
  if (body !== undefined) stream.end(body)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const responseHeaders = (await response)[0]
  responseHeaders[':status'] = String(responseHeaders[':status'])
  return { headers: responseHeaders, body: Buffer.concat(chunks) }
}

for (const protocol of ['h3', 'h2']) {
  test(`${protocol}: routing, metadata, hooks, JSON parsing and validation`, async t => {
    let completed = 0
    const app = await start(t, app => {
      app.addHook('onResponse', async () => { completed++ })
      app.addHook('onSend', async (_req, reply, payload) => { reply.header('x-hook', 'yes'); return payload })
      app.get('/meta', req => ({ version: req.raw.httpVersion, host: req.hostname, ip: req.ip, protocol: req.protocol }))
      app.post('/echo', { schema: { body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } } }, req => req.body)
    })
    const session = await client(t, app, protocol)
    const meta = await request(session, '/meta')
    assert.deepEqual(JSON.parse(meta.body), { version: protocol === 'h3' ? '3.0' : '2.0', host: 'localhost', ip: '127.0.0.1', protocol: 'https' })
    assert.equal(meta.headers['x-hook'], 'yes')
    assert.match(meta.headers['alt-svc'], new RegExp(`h3=":${app.server.address().port}"`))
    const echo = await request(session, '/echo', { method: 'POST', body: '{"name":"QUIC"}', headers: { 'content-type': 'application/json' } })
    assert.deepEqual(JSON.parse(echo.body), { name: 'QUIC' })
    const invalid = await request(session, '/echo', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })
    assert.equal(invalid.headers[':status'], '400')
    const malformed = await request(session, '/echo', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } })
    assert.equal(malformed.headers[':status'], '400')
    const large = await request(session, '/echo', { method: 'POST', body: JSON.stringify({ name: 'x'.repeat(2048) }), headers: { 'content-type': 'application/json' } })
    assert.equal(large.headers[':status'], '413')
    assert.equal((await request(session, '/missing')).headers[':status'], '404')
    assert.equal(completed, 6)
  })

  test(`${protocol}: streaming, HEAD, cookies, errors and trailers`, async t => {
    const payload = Buffer.alloc(2 * 1024 * 1024, 'q')
    const app = await start(t, app => {
      app.get('/stream', (_req, reply) => reply.send(Readable.from([payload.subarray(0, 8000), payload.subarray(8000)])))
      app.get('/cookies', (_req, reply) => reply.header('set-cookie', ['one=1', 'two=2']).send('cookies'))
      app.get('/error', async () => { throw new Error('test error') })
      app.get('/trailers', (_req, reply) => {
        reply.trailer('x-checksum', async () => 'verified')
        return 'trailer body'
      })
    })
    const session = await client(t, app, protocol)
    assert.deepEqual((await request(session, '/stream')).body, payload)
    assert.equal((await request(session, '/stream', { method: 'HEAD' })).body.length, 0)
    assert.deepEqual((await request(session, '/cookies')).headers['set-cookie'], ['one=1', 'two=2'])
    assert.equal((await request(session, '/error')).headers[':status'], '500')
    const stream = session.request({ ':method': 'GET', ':path': '/trailers', ':authority': 'localhost', ':scheme': 'https' }, { endStream: true })
    const trailers = once(stream, 'trailers')
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    assert.equal(Buffer.concat(chunks).toString(), 'trailer body')
    assert.equal((await trailers)[0]['x-checksum'], 'verified')
  })

  test(`${protocol}: concurrent requests and aborting an upload preserves other streams`, async t => {
    const entered = Promise.withResolvers()
    const aborted = Promise.withResolvers()
    const app = await start(t, app => {
      app.addHook('onRequest', async req => {
        if (req.url === '/upload') {
          entered.resolve()
        }
      })
      app.addHook('onRequestAbort', async (_req) => aborted.resolve())
      app.post('/upload', req => req.body)
      app.get('/id/:id', req => ({ id: req.params.id }))
    })
    const session = await client(t, app, protocol)
    const values = await Promise.all(Array.from({ length: 20 }, async (_, id) => {
      const response = await request(session, `/id/${id}`)
      return JSON.parse(response.body).id
    }))
    assert.deepEqual(values, Array.from({ length: 20 }, (_, id) => String(id)))
    const upload = session.request({
      ':method': 'POST',
      ':path': '/upload',
      ':authority': 'localhost',
      ':scheme': 'https',
      'content-type': 'application/json'
    }, { endStream: false })
    upload.on('error', () => {})
    upload.write('{')
    await entered.promise
    if (protocol === 'h3') upload.close(0x10c)
    else upload.destroy(new Error('cancelled upload'))
    await aborted.promise
    assert.deepEqual(JSON.parse((await request(session, '/id/alive')).body), { id: 'alive' })
  })

  test(`${protocol}: static plugin, ranges, conditional requests and SPA fallback`, async t => {
    writeFileSync(join(directory, 'index.html'), '<main>HTTP/3 SPA</main>')
    writeFileSync(join(directory, 'asset.txt'), '0123456789')
    const app = await start(t, async app => {
      await app.register(require('@fastify/static'), { root: directory, index: 'index.html', allowedPath: path => !path.endsWith('.pem') })
      app.setNotFoundHandler((req, reply) => {
        if ((req.method === 'GET' || req.method === 'HEAD') && req.headers.accept?.includes('text/html')) return reply.sendFile('index.html')
        return reply.code(404).send({ error: 'Not found' })
      })
    })
    const session = await client(t, app, protocol)
    const asset = await request(session, '/asset.txt')
    assert.equal(asset.body.toString(), '0123456789')
    const range = await request(session, '/asset.txt', { headers: { range: 'bytes=2-5' } })
    assert.equal(range.headers[':status'], '206')
    assert.equal(range.body.toString(), '2345')
    const cached = await request(session, '/asset.txt', { headers: { 'if-none-match': asset.headers.etag } })
    assert.equal(cached.headers[':status'], '304')
    assert.equal(cached.body.length, 0)
    const spa = await request(session, '/dashboard/deep/link', { headers: { accept: 'text/html' } })
    assert.equal(spa.body.toString(), '<main>HTTP/3 SPA</main>')
    assert.equal((await request(session, '/missing.js')).headers[':status'], '404')
  })
}

test('optional HTTP/1.1 fallback advertises HTTP/3', async t => {
  const app = await start(t, app => app.get('/', req => ({ version: req.raw.httpVersion })), { allowHTTP1: true })
  const result = await new Promise((resolve, reject) => {
    https.get({ host: '127.0.0.1', port: app.server.address().port, ca: tls.cert, agent: false }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks).toString() }))
    }).on('error', reject)
  })
  assert.deepEqual(JSON.parse(result.body), { version: '1.1' })
  assert.match(result.headers['alt-svc'], /h3=/)
})

test('Fastify close waits for an in-flight HTTP/3 response', async t => {
  const entered = Promise.withResolvers()
  const release = Promise.withResolvers()
  const app = await start(t, app => app.get('/', async () => { entered.resolve(); await release.promise; return 'completed' }))
  const session = await client(t, app)
  const response = request(session, '/')
  await entered.promise
  let closed = false
  const closing = app.close().then(() => { closed = true })
  await new Promise(resolve => setTimeout(resolve, 30))
  assert.equal(closed, false)
  release.resolve()
  assert.equal((await response).body.toString(), 'completed')
  await closing
  assert.equal(app.server.address(), null)
})
