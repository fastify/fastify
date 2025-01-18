'use strict'

const { after, describe, test } = require('node:test')
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

describe('http2 plain test', async t => {
  const fastify = Fastify({
    http2: true
  })

  fastify.get('/', function (req, reply) {
    reply.code(200).send(msg)
  })

  fastify.get('/host', function (req, reply) {
    reply.code(200).send(req.host)
  })

  fastify.get('/hostname_port', function (req, reply) {
    reply.code(200).send({ hostname: req.hostname, port: req.port })
  })

  after(() => { fastify.close() })

  await fastify.listen({ port: 0 })

  test('http get request', async (t) => {
    t.plan(3)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.headers[':status'], 200)
    t.assert.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)

    t.assert.deepStrictEqual(JSON.parse(res.body), msg)
  })

  test('http host', async (t) => {
    t.plan(1)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/host`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.body, host)
  })
  test('http hostname and port', async (t) => {
    t.plan(2)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/hostname_port`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(JSON.parse(res.body).hostname, host.split(':')[0])
    t.assert.strictEqual(JSON.parse(res.body).port, parseInt(host.split(':')[1]))
  })
})
