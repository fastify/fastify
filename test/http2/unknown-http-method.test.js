'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

const fastify = Fastify({
  http2: true
})

fastify.get('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.listen({ port: 0 }, err => {
  t.error(err)
  t.teardown(() => { fastify.close() })

  test('http UNKNOWN_METHOD request', async (t) => {
    t.plan(2)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url, method: 'UNKNOWN_METHOD' })

    t.equal(res.headers[':status'], 404)
    t.same(JSON.parse(res.body), {
      statusCode: 404,
      error: 'Not Found',
      message: 'Not Found'
    })
  })
})
