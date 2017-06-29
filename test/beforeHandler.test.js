'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('beforeHandler', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.beforeHandler = true
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { beforeHandler: true, hello: 'world' })
  })
})

test('beforeHandler should be called after preHandler hook', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    req.body.check = 'a'
    next()
  })

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.check += 'b'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'ab', hello: 'world' })
  })
})

test('beforeHandler should be unique per route', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.hello = 'earth'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'earth' })
  })

  fastify.inject({
    method: 'POST',
    url: '/no',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('beforeHandler should handle errors', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      done(new Error('kaboom'))
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 500)
    t.deepEqual(payload, {
      message: 'kaboom',
      error: 'Internal Server Error',
      statusCode: 500
    })
  })
})

test('beforeHandler should handle errors with custom status code', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      reply.code(401)
      done(new Error('go away'))
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, res => {
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 401)
    t.deepEqual(payload, {
      message: 'go away',
      error: 'Unauthorized',
      statusCode: 401
    })
  })
})
