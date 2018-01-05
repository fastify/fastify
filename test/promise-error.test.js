'use strict'

const t = require('tap')
const Fastify = require('..')
const sget = require('simple-get').concat

t.plan(4)

process.removeAllListeners('uncaughtException')

process.on('uncaughtException', (err) => {
  t.type(err, TypeError)
  t.strictEqual(err.message, "Attempted to reject a promise with a non-error value from type 'string'")
  t.strictEqual(err.cause, 'string')
})

const fastify = Fastify()

const noneError = 'string'
fastify.get('/', () => {
  return Promise.reject(noneError)
})

fastify.listen(0, () => {
  fastify.server.unref()

  sget({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/`
  }, err => {
    t.ok(err)
  })
})
