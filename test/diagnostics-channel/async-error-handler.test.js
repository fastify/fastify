'use strict'

const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const Fastify = require('../..')
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('diagnostics channel tracks async operations in async error handlers', async t => {
  t.plan(12)
  let callOrder = 0
  let firstEncounteredMessage
  let asyncStartFired = false
  let asyncEndFired = false

  diagnostics.subscribe('tracing:fastify.request.handler:start', (msg) => {
    t.assert.strictEqual(callOrder++, 0)
    firstEncounteredMessage = msg
    t.assert.ok(msg.request instanceof Request)
    t.assert.ok(msg.reply instanceof Reply)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.assert.strictEqual(callOrder++, 1)
    t.assert.ok(msg.error instanceof Error)
    t.assert.strictEqual(msg.error.message, 'handler error')
  })

  diagnostics.subscribe('tracing:fastify.request.handler:asyncStart', (msg) => {
    t.assert.strictEqual(callOrder++, 2)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    asyncStartFired = true
  })

  diagnostics.subscribe('tracing:fastify.request.handler:asyncEnd', (msg) => {
    t.assert.strictEqual(callOrder++, 3)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    asyncEndFired = true
  })

  diagnostics.subscribe('tracing:fastify.request.handler:end', (msg) => {
    t.assert.strictEqual(callOrder++, 4)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    t.assert.strictEqual(msg.async, true)
  })

  const fastify = Fastify()
  
  fastify.setErrorHandler(async (error, request, reply) => {
    await new Promise(resolve => setImmediate(resolve))
    reply.status(503).send({ error: error.message })
  })

  fastify.get('/', async () => {
    throw new Error('handler error')
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const response = await fetch(fastifyServer)
  t.assert.ok(!response.ok)
  t.assert.strictEqual(response.status, 503)
  t.assert.ok(asyncStartFired, 'asyncStart should fire for async error handler')
  t.assert.ok(asyncEndFired, 'asyncEnd should fire for async error handler')
})
