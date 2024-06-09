'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('hasRoute', t => {
  t.plan(5)
  const test = t.test
  const fastify = Fastify()

  test('hasRoute - invalid options', t => {
    t.plan(3)

    t.equal(fastify.hasRoute({ }), false)

    t.equal(fastify.hasRoute({ method: 'GET' }), false)

    t.equal(fastify.hasRoute({ constraints: [] }), false)
  })

  test('hasRoute - primitive method', t => {
    t.plan(2)
    fastify.route({
      method: 'GET',
      url: '/',
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })

    t.equal(fastify.hasRoute({
      method: 'GET',
      url: '/'
    }), true)

    t.equal(fastify.hasRoute({
      method: 'POST',
      url: '/'
    }), false)
  })

  test('hasRoute - with constraints', t => {
    t.plan(2)
    fastify.route({
      method: 'GET',
      url: '/',
      constraints: { version: '1.2.0' },
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    t.equal(fastify.hasRoute({
      method: 'GET',
      url: '/',
      constraints: { version: '1.2.0' }
    }), true)

    t.equal(fastify.hasRoute({
      method: 'GET',
      url: '/',
      constraints: { version: '1.3.0' }
    }), false)
  })

  test('hasRoute - parametric route regexp with constraints', t => {
    t.plan(1)
    // parametric with regexp
    fastify.get('/example/:file(^\\d+).png', function (request, reply) { })

    t.equal(fastify.hasRoute({
      method: 'GET',
      url: '/example/:file(^\\d+).png'
    }), true)
  })

  test('hasRoute - finds a route even if method is not uppercased', t => {
    t.plan(1)
    fastify.route({
      method: 'GET',
      url: '/equal',
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })

    t.equal(fastify.hasRoute({
      method: 'get',
      url: '/equal'
    }), true)
  })
})
