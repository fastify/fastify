'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('fastify.routes contain an iterator with all the routes', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/test', () => {})

  t.ok(fastify.routes)
  t.is(typeof fastify.routes, 'function')
  t.is(typeof fastify.routes()[Symbol.iterator], 'function')

  for (var route of fastify.routes()) {
    t.ok(route['/'] || route['/test'])

    if (route['/']) {
      t.ok(route['/'].get)
      t.ok(route['/'].post)
    }

    if (route['/test']) {
      t.ok(route['/test'].get)
    }
  }
})
