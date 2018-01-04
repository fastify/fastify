'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Should throw when non-error value is used to reject a promise', t => {
  t.plan(3)

  process.removeAllListeners('uncaughtException')

  process.once('uncaughtException', (err) => {
    t.type(err, TypeError)
    t.strictEqual(err.message, "Attempted to reject a promise with a non-error value from type 'string'")
    t.strictEqual(err.cause, 'string')
  })

  const fastify = Fastify()

  const noneError = 'string'
  fastify.get('/', () => {
    return Promise.reject(noneError)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.fail('should not be called')
  })
})
