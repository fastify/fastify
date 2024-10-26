'use strict'

const { test } = require('node:test')
const Fastify = require('../..')
const h2url = require('h2url')
const sget = require('simple-get').concat
const msg = { hello: 'world' }

const { buildCertificate } = require('../build-certificate')
test.before(buildCertificate)

test('secure with fallback', async (t) => {
  t.plan(6)

  let fastify
  try {
    fastify = Fastify({
      http2: true,
      https: {
        allowHTTP1: true,
        key: global.context.key,
        cert: global.context.cert
      }
    })
    t.assert.ok(true, 'Key/cert successfully loaded')
  } catch (e) {
    t.assert.fail('Key/cert loading failed')
  }

  fastify.get('/', function (req, reply) {
    reply.code(200).send(msg)
  })

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body)
  })

  fastify.get('/error', async function (req, reply) {
    throw new Error('kaboom')
  })

  t.after(() => { fastify.close() })

  await fastify.listen({ port: 0 })

  await t.test('https get error', async (t) => {
    t.plan(1)

    const url = `https://localhost:${fastify.server.address().port}/error`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.headers[':status'], 500)
  })

  await t.test('https post', async (t) => {
    t.plan(2)

    const url = `https://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({
      url,
      method: 'POST',
      body: JSON.stringify({ hello: 'http2' }),
      headers: {
        'content-type': 'application/json'
      }
    })

    t.assert.strictEqual(res.headers[':status'], 200)
    t.assert.deepStrictEqual(JSON.parse(res.body), { hello: 'http2' })
  })

  await t.test('https get request', async (t) => {
    t.plan(3)

    const url = `https://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.headers[':status'], 200)
    t.assert.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)
    t.assert.deepStrictEqual(JSON.parse(res.body), msg)
  })

  await t.test('http1 get request', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      done()
    })
  })

  await t.test('http1 get error', (t, done) => {
    t.plan(2)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/error',
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      done()
    })
  })
})
