'use strict'

const t = require('tap')
const diagnostics = require('node:diagnostics_channel')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../..')
const { getServerUrl } = require('../helper')
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')

test('diagnostics channel async events fire in expected order', t => {
  t.plan(18)
  let callOrder = 0
  let firstEncounteredMessage

  diagnostics.subscribe('tracing:fastify.request.handler:start', (msg) => {
    t.equal(callOrder++, 0)
    firstEncounteredMessage = msg
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:end', (msg) => {
    t.equal(callOrder++, 1)
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
    t.equal(msg, firstEncounteredMessage)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:asyncStart', (msg) => {
    t.equal(callOrder++, 2)
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
    t.equal(msg, firstEncounteredMessage)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:asyncEnd', (msg) => {
    t.equal(callOrder++, 3)
    t.ok(msg.request instanceof Request)
    t.ok(msg.reply instanceof Reply)
    t.equal(msg, firstEncounteredMessage)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.fail('should not trigger error channel')
  })

  const fastify = Fastify()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: async function (req, reply) {
      return { hello: 'world' }
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
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})
