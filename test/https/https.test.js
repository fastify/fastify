'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../..')

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('https', (t) => {
  t.plan(4)

  let fastify
  try {
    fastify = Fastify({
      https: {
        key: global.context.key,
        cert: global.context.cert
      }
    })
    t.pass('Key/cert successfully loaded')
  } catch (e) {
    t.fail('Key/cert loading failed', e)
  }

  fastify.get('/', function (req, reply) {
    reply.code(200).send({ hello: 'world' })
  })

  fastify.get('/proto', function (req, reply) {
    reply.code(200).send({ proto: req.protocol })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    t.test('https get request', t => {
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

    t.test('https get request without trust proxy - protocol', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'https://localhost:' + fastify.server.address().port + '/proto',
        rejectUnauthorized: false
      }, (err, response, body) => {
        t.error(err)
        t.same(JSON.parse(body), { proto: 'https' })
      })
      sget({
        method: 'GET',
        url: 'https://localhost:' + fastify.server.address().port + '/proto',
        rejectUnauthorized: false,
        headers: {
          'x-forwarded-proto': 'lorem'
        }
      }, (err, response, body) => {
        t.error(err)
        t.same(JSON.parse(body), { proto: 'https' })
      })
    })
  })
})
