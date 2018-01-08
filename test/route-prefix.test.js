'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Prefix options should add a prefix for all the routes inside a register / 1', t => {
  t.plan(6)
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
    }, { prefix: '/v2' })

    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/v2/first' })
  })
})

test('Prefix options should add a prefix for all the routes inside a register / 2', t => {
  t.plan(4)
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
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/second'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/second' })
  })
})

test('Prefix options should add a prefix for all the chained routes inside a register / 3', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify
      .get('/first', (req, reply) => {
        reply.send({ route: '/v1/first' })
      })
      .get('/second', (req, reply) => {
        reply.send({ route: '/v1/second' })
      })
    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/second'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/second' })
  })
})

test('Prefix should support parameters as well', t => {
  t.plan(2)
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
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { id: 'param' })
  })
})

test('Prefix should support /', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })
    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Prefix without /', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })
    next()
  }, { prefix: 'v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Prefix works multiple levels deep', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, next) {
    fastify.register(function (fastify, opts, next) {
      fastify.register(function (fastify, opts, next) {
        fastify.register(function (fastify, opts, next) {
          fastify.get('/', (req, reply) => {
            reply.send({ hello: 'world' })
          })
          next()
        }, { prefix: '/v3' })
        next()
      }) // No prefix on this level
      next()
    }, { prefix: 'v2' })
    next()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/v3'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Different register - encapsulation check', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/first', (req, reply) => {
    reply.send({ route: '/first' })
  })

  fastify.register(function (instance, opts, next) {
    instance.register(function (f, opts, next) {
      f.get('/', (req, reply) => {
        reply.send({ route: '/v1/v2' })
      })
      next()
    }, { prefix: '/v2' })
    next()
  }, { prefix: '/v1' })

  fastify.register(function (instance, opts, next) {
    instance.register(function (f, opts, next) {
      f.get('/', (req, reply) => {
        reply.send({ route: '/v3/v4' })
      })
      next()
    }, { prefix: '/v4' })
    next()
  }, { prefix: '/v3' })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/v2' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v3/v4'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v3/v4' })
  })
})
