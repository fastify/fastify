'use strict'

const { test } = require('node:test')
const diagnostics = require('node:diagnostics_channel')
const sget = require('simple-get').concat
const Fastify = require('../..')
const { getServerUrl } = require('../helper')
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('diagnostics channel events report on errors', (t, done) => {
  t.plan(14)
  let callOrder = 0
  let firstEncounteredMessage

  diagnostics.subscribe('tracing:fastify.request.handler:start', (msg) => {
    t.assert.strictEqual(callOrder++, 0)
    firstEncounteredMessage = msg
    t.assert.ok(msg.request instanceof Request)
    t.assert.ok(msg.reply instanceof Reply)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:end', (msg) => {
    t.assert.ok(msg.request instanceof Request)
    t.assert.ok(msg.reply instanceof Reply)
    t.assert.strictEqual(callOrder++, 2)
    t.assert.strictEqual(msg, firstEncounteredMessage)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.assert.ok(msg.request instanceof Request)
    t.assert.ok(msg.reply instanceof Reply)
    t.assert.ok(msg.error instanceof Error)
    t.assert.strictEqual(callOrder++, 1)
    t.assert.strictEqual(msg.error.message, 'borked')
  })

  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: function (req, reply) {
      throw new Error('borked')
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    if (err) t.assert.ifError(err)

    t.after(() => { fastify.close() })

    sget({
      method: 'GET',
      url: getServerUrl(fastify) + '/'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 500)
      done()
    })
  })
})
