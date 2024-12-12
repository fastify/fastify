'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { request, setGlobalDispatcher, Agent } = require('undici')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

test('post empty body', async t => {
  const fastify = Fastify()
  const abortController = new AbortController()
  const { signal } = abortController
  t.after(() => {
    fastify.close()
    abortController.abort()
  })

  fastify.post('/bug', async (request, reply) => { })

  const address = await fastify.listen({ port: 0 })

  const res = await request(`${address}/bug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ foo: 'bar' }),
    signal
  })

  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(await res.body.text(), '')
})
