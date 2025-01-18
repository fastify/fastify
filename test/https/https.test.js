'use strict'

const { after, describe, test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../..')

const { buildCertificate } = require('../build-certificate')
test.before(buildCertificate)

describe('https', async (t) => {
  const fastify = Fastify({
    https: {
      key: global.context.key,
      cert: global.context.cert
    }
  })

  fastify.get('/', function (req, reply) {
    reply.code(200).send({ hello: 'world' })
  })

  fastify.get('/proto', function (req, reply) {
    reply.code(200).send({ proto: req.protocol })
  })

  await fastify.listen({ port: 0 })

  after(() => { fastify.close() })

  test('https get request', (t, done) => {
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

  test('https get request without trust proxy - protocol', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/proto',
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(body), { proto: 'https' })
    })
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port + '/proto',
      rejectUnauthorized: false,
      headers: {
        'x-forwarded-proto': 'lorem'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(body), { proto: 'https' })
      done()
    })
  })
})

describe('https - headers', async (t) => {
  const fastify = Fastify({
    https: {
      key: global.context.key,
      cert: global.context.cert
    }
  })

  fastify.get('/', function (req, reply) {
    reply.code(200).send({ hello: 'world', hostname: req.hostname, port: req.port })
  })

  after(async () => { await fastify.close() })

  await fastify.listen({ port: 0 })

  test('https get request', (t, done) => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      const parsedBody = JSON.parse(body)
      t.assert.strictEqual(parsedBody.hostname, 'localhost')
      t.assert.strictEqual(parsedBody.port, fastify.server.address().port)
      done()
    })
  })

  test('https get request - test port fall back', (t, done) => {
    t.plan(3)
    sget({
      method: 'GET',
      headers: {
        host: 'example.com'
      },
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      const parsedBody = JSON.parse(body)
      t.assert.strictEqual(parsedBody.port, null)
      done()
    })
  })
})
