'use strict'

const t = require('tap')
const test = t.test
const fs = require('fs')
const path = require('path')
const Fastify = require('../..')
const h2url = require('h2url')
const sget = require('simple-get').concat
const msg = { hello: 'world' }

var fastify
try {
  fastify = Fastify({
    http2: true,
    https: {
      allowHTTP1: true,
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    }
  })
  t.pass('Key/cert successfully loaded')
} catch (e) {
  t.fail('Key/cert loading failed', e)
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

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('https get error', async (t) => {
    t.plan(1)

    const url = `https://localhost:${fastify.server.address().port}/error`
    const res = await h2url.concat({ url })

    t.strictEqual(res.headers[':status'], 500)
  })

  test('https post', async (t) => {
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

    t.strictEqual(res.headers[':status'], 200)
    t.deepEqual(JSON.parse(res.body), { hello: 'http2' })
  })

  test('https get request', async (t) => {
    t.plan(3)

    const url = `https://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.strictEqual(res.headers[':status'], 200)
    t.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)
    t.deepEqual(JSON.parse(res.body), msg)
  })

  test('http1 get request', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('http1 get error', (t) => {
    t.plan(2)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/error',
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})
