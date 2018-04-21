'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

var fastify
try {
  fastify = Fastify({
    http2: true
  })
  t.pass('http2 successfully loaded')
} catch (e) {
  t.fail('http2 loading failed', e)
}

fastify.get('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('http UNKNOWN_METHOD request', async (t) => {
    t.plan(2)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url, method: 'UNKNOWN_METHOD' })

    t.strictEqual(res.headers[':status'], 404)
    t.deepEqual(JSON.parse(res.body), {
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found'
    })
  })
})
