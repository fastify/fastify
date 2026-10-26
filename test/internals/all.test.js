'use strict'

const { test } = require('node:test')
const Fastify = require('../..')

test('fastify.all should add all the methods to the same url', async t => {
  const fastify = Fastify()

  const requirePayload = [
    'POST',
    'PUT',
    'PATCH',
    'QUERY'
  ]

  const supportedMethods = fastify.supportedMethods
  t.plan(supportedMethods.length)

  fastify.all('/', (req, reply) => {
    reply.send({ method: req.raw.method })
  })

  await Promise.all(supportedMethods.map(async method => injectRequest(method)))

  async function injectRequest (method) {
    const options = {
      url: '/',
      method
    }

    if (requirePayload.includes(method)) {
      options.payload = { hello: 'world' }
    }

    const res = await fastify.inject(options)
    if (method === 'HEAD') {
      // A HEAD response has no body, only the headers of the GET-like response
      t.assert.strictEqual(res.headers['content-length'], String(Buffer.byteLength(JSON.stringify({ method }))))
      return
    }
    const payload = JSON.parse(res.payload)
    t.assert.deepStrictEqual(payload, { method })
  }
})
