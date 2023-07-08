'use strict'

// Tests for some deprecated `request.*` keys. This file should be
// removed when the deprecation is complete.

process.removeAllListeners('warning')

const test = require('tap').test
const Fastify = require('../')

test('Should expose router options via getters on request and reply', t => {
  t.plan(7)
  const fastify = Fastify()
  const expectedSchema = {
    params: {
      id: { type: 'integer' }
    }
  }

  fastify.get('/test/:id', {
    schema: expectedSchema
  }, (req, reply) => {
    t.equal(req.routeConfig.url, '/test/:id')
    t.equal(req.routeConfig.method, 'GET')
    t.same(req.routeSchema, expectedSchema)
    t.equal(req.routerPath, '/test/:id')
    t.equal(req.routerMethod, 'GET')
    reply.send()
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
