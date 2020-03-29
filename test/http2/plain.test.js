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

fastify.get('/hostname', function (req, reply) {
  reply.code(200).send(req.hostname)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('http get request', async (t) => {
    t.plan(3)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.strictEqual(res.headers[':status'], 200)
    t.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)

    t.deepEqual(JSON.parse(res.body), msg)
  })

  test('http hostname', async (t) => {
    t.plan(1)

    const hostname = `localhost:${fastify.server.address().port}`

    const url = `http://${hostname}/hostname`
    const res = await h2url.concat({ url })

    t.strictEqual(res.body, hostname)
  })
})
