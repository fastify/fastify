'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { FST_ERR_ROUTE_INVALID_LOG_LEVEL } = require('../lib/errors')

test('route logLevel validation', async t => {
  t.plan(5)

  await t.test('should throw error for invalid logLevel at registration time', async (t) => {
    t.plan(3)

    const fastify = Fastify({ logger: true })

    t.assert.throws(
      () => {
        fastify.get('/', { logLevel: 'invalid' }, async () => 'hello')
      },
      (err) => {
        t.assert.strictEqual(err.code, 'FST_ERR_ROUTE_INVALID_LOG_LEVEL')
        t.assert.ok(err.message.includes('invalid'))
        return true
      }
    )
  })

  await t.test('should accept valid log levels', async (t) => {
    t.plan(7)

    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']

    for (const level of validLevels) {
      const fastify = Fastify({ logger: true })
      t.assert.doesNotThrow(() => {
        fastify.get(`/${level}`, { logLevel: level }, async () => 'ok')
      })
    }
  })

  await t.test('should reject case-sensitive invalid levels', async (t) => {
    t.plan(2)

    const fastify = Fastify({ logger: true })

    t.assert.throws(
      () => {
        fastify.get('/', { logLevel: 'INFO' }, async () => 'hello')
      },
      (err) => {
        t.assert.strictEqual(err.code, 'FST_ERR_ROUTE_INVALID_LOG_LEVEL')
        return true
      }
    )
  })

  await t.test('should not throw when logger is disabled', async (t) => {
    t.plan(1)

    const fastify = Fastify({ logger: false })

    t.assert.doesNotThrow(() => {
      // When logger is disabled, we don't validate logLevel
      // because there's no logger to validate against
      fastify.get('/', { logLevel: 'invalid' }, async () => 'hello')
    })
  })

  await t.test('should not throw for empty string logLevel (means use default)', async (t) => {
    t.plan(1)

    const fastify = Fastify({ logger: true })

    t.assert.doesNotThrow(() => {
      // Empty string means 'use default level', which is valid
      fastify.get('/', { logLevel: '' }, async () => 'hello')
    })
  })
})
