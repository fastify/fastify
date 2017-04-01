'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../../fastify')

test('fastify._routes contain a map with all the routes', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/test', () => {})

  t.ok(fastify._routes)
  t.ok(fastify._routes instanceof Map)
  t.is(fastify._routes.size, 2)
})
