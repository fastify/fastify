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

fastify.get('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.get('/host', function (req, reply) {
  reply.code(200).send(req.host)
})

fastify.get('/hostname_port', function (req, reply) {
  reply.code(200).send({ hostname: req.hostname, port: req.port })
})

fastify.listen({ port: 0 }, err => {
  t.error(err)
  t.teardown(() => { fastify.close() })

  test('http get request', async (t) => {
    t.plan(3)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.equal(res.headers[':status'], 200)
    t.equal(res.headers['content-length'], '' + JSON.stringify(msg).length)

    t.same(JSON.parse(res.body), msg)
  })

  test('http host', async (t) => {
    t.plan(1)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/host`
    const res = await h2url.concat({ url })

    t.equal(res.body, host)
  })
  test('http hostname and port', async (t) => {
    t.plan(2)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/hostname_port`
    const res = await h2url.concat({ url })

    t.equal(JSON.parse(res.body).hostname, host.split(':')[0])
    t.equal(JSON.parse(res.body).port, parseInt(host.split(':')[1]))
  })
})
