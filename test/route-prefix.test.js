'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Prefix options should add a prefix for all the routes inside a register / 1', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/first', (req, reply) => {
    reply.send({ route: '/first' })
  })

  fastify.register(function (fastify, opts, next) {
    fastify.get('/first', (req, reply) => {
      reply.send({ route: '/v1/first' })
    })

    fastify.register(function (fastify, opts, next) {
      fastify.get('/first', (req, reply) => {
        reply.send({ route: '/v1/v2/first' })
      })
      next()
    }, { prefix: '/v2' }, next)
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/first'
  }, res => {
    t.same(JSON.parse(res.payload), { route: '/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, res => {
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/first'
  }, res => {
    t.same(JSON.parse(res.payload), { route: '/v1/v2/first' })
  })
})

test('Prefix options should add a prefix for all the routes inside a register / 2', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify.get('/first', (req, reply) => {
      reply.send({ route: '/v1/first' })
    })

    fastify.get('/second', (req, reply) => {
      reply.send({ route: '/v1/second' })
    })
    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, res => {
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/second'
  }, res => {
    t.same(JSON.parse(res.payload), { route: '/v1/second' })
  })
})

test('Prefix should support parameters as well', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify.get('/hello', (req, reply) => {
      reply.send({ id: req.params.id })
    })
    next()
  }, { prefix: '/v1/:id' })

  fastify.inject({
    method: 'GET',
    url: '/v1/param/hello'
  }, res => {
    t.same(JSON.parse(res.payload), { id: 'param' })
  })
})
