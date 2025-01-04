'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')

process.removeAllListeners('warning')

test('contentTypeParser should add a custom async parser', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.options('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addContentTypeParser('application/jsoff', async function (req, payload) {
    const res = await new Promise((resolve, reject) => resolve(payload))
    return res
  })

  t.after(() => fastify.close())
  await fastify.listen({ port: 0 })

  await t.test('in POST', (t, done) => {
    t.plan(3)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      done()
    })
  })

  await t.test('in OPTIONS', (t, done) => {
    t.plan(3)

    sget({
      method: 'OPTIONS',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      done()
    })
  })
})
