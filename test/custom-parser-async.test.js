'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')

process.removeAllListeners('warning')

test('contentTypeParser should add a custom async parser', async t => {
  // t.plan(3)
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

  try {
    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })

    await new Promise((resolve, reject) => {
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
        resolve()
      })
    })
  } catch (err) {
    t.assert.ifError(err)
  }
})
