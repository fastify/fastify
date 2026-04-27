'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const timingPlugin = require('../lib/timing-plugin')

test('timing plugin should add X-Response-Time header', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(timingPlugin)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.ok(response.headers['x-response-time'], 'X-Response-Time header should exist')
  t.assert.strictEqual(response.statusCode, 200, 'Response status should be 200')
})

test('timing plugin should return reasonable response time value', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(timingPlugin)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  const responseTime = response.headers['x-response-time']
  t.assert.ok(responseTime, 'X-Response-Time header should exist')

  const responseTimeNum = parseFloat(responseTime)
  t.assert.ok(!isNaN(responseTimeNum), 'Response time should be a number')
  t.assert.ok(responseTimeNum > 0, 'Response time should be greater than 0')
})

test('timing plugin should support custom header name', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(timingPlugin, {
    headerName: 'X-Custom-Response-Time'
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.ok(response.headers['x-custom-response-time'], 'Custom header should exist')
  t.assert.ok(!response.headers['x-response-time'], 'Default header should not exist')

  const responseTime = response.headers['x-custom-response-time']
  const responseTimeNum = parseFloat(responseTime)
  t.assert.ok(responseTimeNum > 0, 'Custom header value should be greater than 0')
})

test('timing plugin should not affect normal response content', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(timingPlugin)

  const expectedResponse = { hello: 'world', message: 'test' }
  fastify.get('/', (req, reply) => {
    reply.send(expectedResponse)
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200, 'Response status should be 200')
  t.assert.ok(response.headers['x-response-time'], 'X-Response-Time header should exist')
  t.assert.deepStrictEqual(JSON.parse(response.payload), expectedResponse, 'Response body should match expected')
})

test('timing plugin should handle concurrent requests independently', async t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(timingPlugin)

  fastify.get('/fast', (req, reply) => {
    reply.send({ type: 'fast' })
  })

  fastify.get('/slow', (req, reply) => {
    setTimeout(() => {
      reply.send({ type: 'slow' })
    }, 50)
  })

  const [response1, response2] = await Promise.all([
    fastify.inject({ method: 'GET', url: '/slow' }),
    fastify.inject({ method: 'GET', url: '/fast' })
  ])

  t.assert.strictEqual(response1.statusCode, 200, 'Slow request status should be 200')
  t.assert.strictEqual(response2.statusCode, 200, 'Fast request status should be 200')

  t.assert.ok(response1.headers['x-response-time'], 'Slow request should have X-Response-Time header')
  t.assert.ok(response2.headers['x-response-time'], 'Fast request should have X-Response-Time header')

  const responseTime1 = parseFloat(response1.headers['x-response-time'])
  const responseTime2 = parseFloat(response2.headers['x-response-time'])

  t.assert.ok(responseTime1 > 0, 'Slow request response time should be greater than 0')
  t.assert.ok(responseTime2 > 0, 'Fast request response time should be greater than 0')
})

test('timing plugin should work with async handlers', async t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(timingPlugin)

  fastify.get('/', async (req, reply) => {
    return { hello: 'async world' }
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.strictEqual(response.statusCode, 200, 'Response status should be 200')
  t.assert.ok(response.headers['x-response-time'], 'X-Response-Time header should exist')

  const responseTime = parseFloat(response.headers['x-response-time'])
  t.assert.ok(responseTime > 0, 'Response time should be greater than 0')
})
