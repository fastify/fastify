'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const net = require('node:net')

function rawRequest (port, path) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`)
    })
    let data = ''
    sock.on('data', (c) => { data += c.toString() })
    sock.on('close', () => resolve(data))
    sock.on('error', reject)
    setTimeout(() => { sock.destroy(); reject(new Error('raw request hung')) }, 4000)
  })
}

test('string payload with sync-returning trailer handler completes and delivers the trailer', async (t) => {
  const app = require('../fastify')()
  t.after(() => app.close())

  app.get('/string-sync', (req, reply) => {
    reply.trailer('x-sum', () => '7')
    return reply.send('body')
  })

  await app.listen({ port: 0 })
  const port = app.server.address().port

  const raw = await rawRequest(port, '/string-sync')
  assert.match(raw, /x-sum: 7\r\n/)
})

test('stream payload with sync-returning trailer handler delivers the trailer', async (t) => {
  const app = require('../fastify')()
  t.after(() => app.close())

  app.get('/stream-sync', (req, reply) => {
    const { Readable } = require('node:stream')
    reply.header('content-type', 'text/plain')
    reply.trailer('x-sum', () => '7')
    return reply.send(Readable.from(['chunk']))
  })

  await app.listen({ port: 0 })
  const port = app.server.address().port

  const raw = await rawRequest(port, '/stream-sync')
  assert.match(raw, /x-sum: 7\r\n/)
})

test('async handler that declares a done parameter is rejected at registration', async (t) => {
  const app = require('../fastify')()
  t.after(() => app.close())

  app.get('/bad-async', (req, reply) => {
    assert.throws(() => {
      reply.trailer('x-bad', async function (rep, payload, done) { done(null, 'v') })
    }, (err) => err.code === 'FST_ERR_TRAILER_INVALID_ASYNC_HANDLER')
    reply.send('ok')
  })

  await app.listen({ port: 0 })
  const res = await app.inject({ method: 'GET', url: '/bad-async' })
  assert.equal(res.statusCode, 200)
})
