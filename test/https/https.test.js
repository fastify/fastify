'use strict'

const { before, test } = require('node:test')
const assert = require('node:assert')
const sget = require('simple-get').concat
const Fastify = require('../..')
const { buildCertificate } = require('../build-certificate')

before(buildCertificate)

test('https', async (t) => {
  let fastify
  try {
    fastify = Fastify({
      https: {
        key: global.context.key,
        cert: global.context.cert
      }
    })
    assert.ok('Key/cert successfully loaded')
  } catch (e) {
    assert.fail('Key/cert loading failed: ' + e.message)
  }

  fastify.get('/', (req, reply) => {
    reply.code(200).send({ hello: 'world' })
  })

  fastify.get('/proto', (req, reply) => {
    reply.code(200).send({ proto: req.protocol })
  })

  await new Promise((resolve, reject) => {
    fastify.listen({ port: 0 }, err => {
      if (err) return reject(err)
      resolve()
    })
  })

  t.after(() => fastify.close())

  await t.test('https get request', async t => {
    try {
      await new Promise((resolve, reject) => {
        sget({
          method: 'GET',
          url: 'https://localhost:' + fastify.server.address().port,
          rejectUnauthorized: false
        }, (err, response, body) => {
          if (err) return reject(err)
          assert.strictEqual(response.statusCode, 200)
          assert.strictEqual(response.headers['content-length'], '' + body.length)
          assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
          resolve()
        })
      })
    } catch (err) {
      t.fail('Request failed: ' + err.message)
    }
  })

  await t.test('https get request without trust proxy - protocol', async t => {
    try {
      await new Promise((resolve, reject) => {
        sget({
          method: 'GET',
          url: 'https://localhost:' + fastify.server.address().port + '/proto',
          rejectUnauthorized: false
        }, (err, response, body) => {
          if (err) return reject(err)
          assert.deepStrictEqual(JSON.parse(body), { proto: 'https' })
          resolve()
        })
      })

      await new Promise((resolve, reject) => {
        sget({
          method: 'GET',
          url: 'https://localhost:' + fastify.server.address().port + '/proto',
          rejectUnauthorized: false,
          headers: {
            'x-forwarded-proto': 'lorem'
          }
        }, (err, response, body) => {
          if (err) return reject(err)
          assert.deepStrictEqual(JSON.parse(body), { proto: 'https' })
          resolve()
        })
      })
    } catch (err) {
      t.fail('Request failed: ' + err.message)
    }
  })
})