'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

test('secure', (t) => {
  t.plan(4)

  let fastify
  try {
    fastify = Fastify({
      http2: true,
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
    reply.code(200).send(msg)
  })
  fastify.get('/proto', function (req, reply) {
    reply.code(200).send({ proto: req.protocol })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    t.test('https get request', async (t) => {
      t.plan(3)

      const url = `https://localhost:${fastify.server.address().port}`
      const res = await h2url.concat({ url })

      t.equal(res.headers[':status'], 200)
      t.equal(res.headers['content-length'], '' + JSON.stringify(msg).length)
      t.same(JSON.parse(res.body), msg)
    })

    t.test('https get request without trust proxy - protocol', async (t) => {
      t.plan(2)

      const url = `https://localhost:${fastify.server.address().port}/proto`
      t.same(JSON.parse((await h2url.concat({ url })).body), { proto: 'https' })
      t.same(JSON.parse((await h2url.concat({ url, headers: { 'X-Forwarded-Proto': 'lorem' } })).body), { proto: 'https' })
    })
  })
})
