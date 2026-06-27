'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('noContent should return 204 with empty body', (t, done) => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/no-content', function (request, reply) {
    reply.noContent()
  })

  fastify.inject({
    method: 'GET',
    url: '/no-content'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.strictEqual(res.payload, '')
    done()
  })
})

test('noContent should be chainable', (t, done) => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/no-content-chain', function (request, reply) {
    t.assert.strictEqual(reply.noContent(), reply)
    done()
  })

  fastify.inject({
    method: 'GET',
    url: '/no-content-chain'
  }, () => {})
})
