'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

let fastify
try {
  fastify = Fastify({
    http2: true
  })
  t.pass('http2 successfully loaded')
} catch (e) {
  t.fail('http2 loading failed', e)
}

fastify.all('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('http HEAD request', async (t) => {
    t.plan(1)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url, method: 'HEAD' })

    t.equal(res.headers[':status'], 200)
  })
})
