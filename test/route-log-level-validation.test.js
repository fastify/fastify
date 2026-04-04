'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('route-level logLevel rejects invalid values', async t => {
  const fastify = Fastify()

  t.assert.throws(() => {
    fastify.get('/a', { logLevel: 'invalid' }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_INVALID_LOG_LEVEL_OPTION' })

  t.assert.throws(() => {
    fastify.get('/b', { logLevel: '' }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_INVALID_LOG_LEVEL_OPTION' })

  t.assert.throws(() => {
    fastify.get('/c', { logLevel: 123 }, async () => 'ok')
  }, { code: 'FST_ERR_ROUTE_INVALID_LOG_LEVEL_OPTION' })
})

test('route-level logLevel accepts valid values', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']

  for (const level of validLevels) {
    t.assert.doesNotThrow(() => {
      fastify.get(`/${level}`, { logLevel: level }, async () => 'ok')
    })
  }

  await fastify.ready()
})

test('route without logLevel option works normally', async t => {
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.doesNotThrow(() => {
    fastify.get('/', async () => 'ok')
  })

  await fastify.ready()
  const response = await fastify.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(response.statusCode, 200)
})
