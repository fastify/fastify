'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Client } = require('undici')
const semver = require('semver')

test('Should return 503 while closing - pipelining', async t => {
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

  const codes = [200, 200, 503]
  const responses = await Promise.all([
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' }),
    instance.request({ path: '/', method: 'GET' })
  ])
  const actual = responses.map(r => r.statusCode)

  t.same(actual, codes)

  await instance.close()
})

test('Should close the socket abruptly - pipelining - return503OnClosing: false', async t => {
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

  t.equal(responses[0].status, 'fulfilled')
  t.equal(responses[1].status, 'fulfilled')
  t.equal(responses[2].status, 'rejected')
  t.equal(responses[3].status, 'rejected')

  await instance.close()
})
