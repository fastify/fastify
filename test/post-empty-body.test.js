'use strict'

const { test } = require('tap')
const fastify = require('../')
const { request, setGlobalDispatcher, Agent } = require('undici')

setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
}))

test('post empty body', async t => {
  const app = fastify()
  t.teardown(app.close.bind(app))

  app.post('/bug', async (request, reply) => {
  })

  await app.listen({ port: 0 })

  const res = await request(`http://127.0.0.1:${app.server.address().port}/bug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ foo: 'bar' })
  })

  t.equal(res.statusCode, 200)
  t.equal(await res.body.text(), '')
})
