'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')

process.removeAllListeners('warning')

test('contentTypeParser should add a custom async parser', async (t) => {
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

  await fastify.listen({ port: 0 })

  t.after(() => fastify.close())

  await t.test('in POST', async (t) => {
    const { response, body } = await new Promise((resolve, reject) => sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      if (err) return reject(err)
      resolve({ response, body })
    }))

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
  })

  await t.test('in OPTIONS', async (t) => {
    const { response, body } = await new Promise((resolve, reject) => sget({
      method: 'OPTIONS',
      url: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      if (err)reject(err)
      resolve({ response, body })
    }))

    t.assert.strictEqual(response.statusCode, 200)
    t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
  })
})
