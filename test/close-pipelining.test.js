'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { Client } = require('undici')

test('Should return 503 while closing - pipelining', { todo: 'flaky test' }, async t => {
  const fastify = Fastify({
    return503OnClosing: true,
    forceCloseConnections: false
  })

  fastify.get('/', async (req, reply) => {
    fastify.close()
    return { hello: 'world' }
  })

  await fastify.listen({ port: 0 })

  const instance = new Client('http://localhost:' + fastify.server.address().port, {
    pipelining: 2
  })

  const [firstRequest, secondRequest, thirdRequest] = await Promise.allSettled([
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' })
  ])
  t.assert.strictEqual(firstRequest.status, 'fulfilled')
  t.assert.strictEqual(secondRequest.status, 'fulfilled')

  t.assert.strictEqual(firstRequest.value.statusCode, 200)
  t.assert.strictEqual(secondRequest.value.statusCode, 200)

  if (thirdRequest.status === 'fulfilled') {
    t.assert.strictEqual(thirdRequest.value.statusCode, 503)
  } else {
    t.assert.strictEqual(thirdRequest.reason.code, 'ECONNREFUSED')
  }

  await instance.close()
})

test('Should close the socket abruptly - pipelining - return503OnClosing: false', { todo: 'flaky test' }, async t => {
  // Since Node v20, we will always invoke server.closeIdleConnections()
  // therefore our socket will be closed
  const fastify = Fastify({
    return503OnClosing: false,
    forceCloseConnections: false
  })

  fastify.get('/', async (req, reply) => {
    reply.send({ hello: 'world' })
    fastify.close()
  })

  await fastify.listen({ port: 0 })

  const instance = new Client('http://localhost:' + fastify.server.address().port, {
    pipelining: 2
  })

  const responses = await Promise.allSettled([
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' })
  ])

  const fulfilled = responses.filter(r => r.status === 'fulfilled')
  const rejected = responses.filter(r => r.status === 'rejected')

  t.assert.strictEqual(fulfilled.length, 2)
  t.assert.strictEqual(rejected.length, 2)

  await instance.close()
})
