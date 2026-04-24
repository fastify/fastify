'use strict'

const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const Fastify = require('../..')
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('diagnostics channel tracks async operations in async error handlers', async t => {
  t.plan(17)
  let callOrder = 0
  let firstEncounteredMessage
  let asyncStartFired = false
  let asyncEndFired = false

  const onStart = (msg) => {
    t.assert.strictEqual(callOrder++, 0)
    firstEncounteredMessage = msg
    t.assert.ok(msg.request instanceof Request)
    t.assert.ok(msg.reply instanceof Reply)
  }

  const onError = (msg) => {
    t.assert.strictEqual(callOrder++, 1)
    t.assert.ok(msg.error instanceof Error)
    t.assert.strictEqual(msg.error.message, 'handler error')
  }

  const onEnd = (msg) => {
    t.assert.strictEqual(callOrder++, 2)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    t.assert.strictEqual(msg.async, true)
  }

  const onAsyncStart = (msg) => {
    t.assert.strictEqual(callOrder++, 3)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    asyncStartFired = true
  }

  const onAsyncEnd = (msg) => {
    t.assert.strictEqual(callOrder++, 4)
    t.assert.strictEqual(msg, firstEncounteredMessage)
    asyncEndFired = true
  }

  diagnostics.subscribe('tracing:fastify.request.handler:start', onStart)
  diagnostics.subscribe('tracing:fastify.request.handler:error', onError)
  diagnostics.subscribe('tracing:fastify.request.handler:end', onEnd)
  diagnostics.subscribe('tracing:fastify.request.handler:asyncStart', onAsyncStart)
  diagnostics.subscribe('tracing:fastify.request.handler:asyncEnd', onAsyncEnd)

  const fastify = Fastify()

  fastify.setErrorHandler(async (error, request, reply) => {
    await new Promise(resolve => setImmediate(resolve))
    reply.status(503).send({ error: error.message })
  })

  fastify.get('/', () => {
    throw new Error('handler error')
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => {
    fastify.close()
    diagnostics.unsubscribe('tracing:fastify.request.handler:start', onStart)
    diagnostics.unsubscribe('tracing:fastify.request.handler:error', onError)
    diagnostics.unsubscribe('tracing:fastify.request.handler:end', onEnd)
    diagnostics.unsubscribe('tracing:fastify.request.handler:asyncStart', onAsyncStart)
    diagnostics.unsubscribe('tracing:fastify.request.handler:asyncEnd', onAsyncEnd)
  })

  const response = await fetch(fastifyServer)
  t.assert.ok(!response.ok)
  t.assert.strictEqual(response.status, 503)
  t.assert.ok(asyncStartFired, 'asyncStart should fire for async error handler')
  t.assert.ok(asyncEndFired, 'asyncEnd should fire for async error handler')
})
