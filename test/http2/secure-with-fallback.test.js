'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')
const sget = require('simple-get').concat
const msg = { hello: 'world' }

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('secure with fallback', (t) => {
  t.plan(7)

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

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    t.test('https get error', async (t) => {
      t.plan(1)

      const url = `https://localhost:${fastify.server.address().port}/error`
      const res = await h2url.concat({ url })

      t.equal(res.headers[':status'], 500)
    })

    t.test('https post', async (t) => {
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

      t.equal(res.headers[':status'], 200)
      t.same(JSON.parse(res.body), { hello: 'http2' })
    })

    t.test('https get request', async (t) => {
      t.plan(3)

      const url = `https://localhost:${fastify.server.address().port}`
      const res = await h2url.concat({ url })

      t.equal(res.headers[':status'], 200)
      t.equal(res.headers['content-length'], '' + JSON.stringify(msg).length)
      t.same(JSON.parse(res.body), msg)
    })

    t.test('http1 get request', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'https://localhost:' + fastify.server.address().port,
        rejectUnauthorized: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-length'], '' + body.length)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })

    t.test('http1 get error', (t) => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'https://localhost:' + fastify.server.address().port + '/error',
        rejectUnauthorized: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 500)
      })
    })
  })
})
