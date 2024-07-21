'use strict'

const t = require('tap')
const diagnostics = require('node:diagnostics_channel')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../..')
const { getServerUrl } = require('../helper')
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('diagnostics channel events report on errors', t => {
  t.plan(14)
  let callOrder = 0
  let firstEncounteredMessage

  diagnostics.subscribe('tracing:fastify.request.handler:start', (msg) => {
    t.equal(callOrder++, 0)
    firstEncounteredMessage = msg
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:end', (msg) => {
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
    t.equal(callOrder++, 2)
    t.equal(msg, firstEncounteredMessage)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
    t.ok(msg.error instanceof Error)
    t.equal(callOrder++, 1)
    t.equal(msg.error.message, 'borked')
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
    if (err) t.error(err)

    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: getServerUrl(fastify) + '/'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 500)
    })
  })
})
