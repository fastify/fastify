'use strict'

const { test, describe } = require('node:test')
const Fastify = require('..')

describe('route logLevel validation', () => {
  test('should throw error for invalid logLevel at registration time', (t, done) => {
    t.plan(3)

    const fastify = Fastify({ logger: true })

    t.assert.throws(
      () => {
        fastify.get('/', { logLevel: 'invalid' }, () => 'hello')
      },
      (err) => {
        t.assert.strictEqual(err.code, 'FST_ERR_ROUTE_INVALID_LOG_LEVEL')
        t.assert.ok(err.message.includes('invalid'))
        return true
      }
    )

    done()
  })

  test('should accept valid log levels', (t, done) => {
    t.plan(7)

    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']

    for (const level of validLevels) {
      const fastify = Fastify({ logger: true })
      t.assert.doesNotThrow(() => {
        fastify.get(`/${level}`, { logLevel: level }, () => 'ok')
      })
    }

    done()
  })

  test('should reject case-sensitive invalid levels', (t, done) => {
    t.plan(2)

    const fastify = Fastify({ logger: true })

    t.assert.throws(
      () => {
        fastify.get('/', { logLevel: 'INFO' }, () => 'hello')
      },
      (err) => {
        t.assert.strictEqual(err.code, 'FST_ERR_ROUTE_INVALID_LOG_LEVEL')
        return true
      }
    )

    done()
  })

  test('should not throw when logger is disabled', (t, done) => {
    t.plan(1)

    const fastify = Fastify({ logger: false })

    t.assert.doesNotThrow(() => {
      // When logger is disabled, we don't validate logLevel
      // because there's no logger to validate against
      fastify.get('/', { logLevel: 'invalid' }, () => 'hello')
    })

    done()
  })

  test('should not throw for empty string logLevel (means use default)', (t, done) => {
    t.plan(1)

    const fastify = Fastify({ logger: true })

    t.assert.doesNotThrow(() => {
      // Empty string means 'use default level', which is valid
      fastify.get('/', { logLevel: '' }, () => 'hello')
    })

    done()
  })
})
