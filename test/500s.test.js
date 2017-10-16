'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('default 500', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (res) => {
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'application/json')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, reply) {
    reply.type('text/plain').send('an error happened: ' + err.message)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (res) => {
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })
})

test('encapsulated 500', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.register(function (f, opts, next) {
    f.get('/', function (req, reply) {
      reply.send(new Error('kaboom'))
    })

    f.setErrorHandler(function (err, reply) {
      reply.type('text/plain').send('an error happened: ' + err.message)
    })

    next()
  }, { prefix: 'test' })

  fastify.inject({
    method: 'GET',
    url: '/test'
  }, (res) => {
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (res) => {
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'application/json')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500 with hooks', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, reply) {
    reply.type('text/plain').send('an error happened: ' + err.message)
  })

  fastify.addHook('onSend', (req, res, payload, next) => {
    t.ok('called', 'onSend')
    next()
  })
  fastify.addHook('onRequest', (req, res, next) => {
    t.ok('called', 'onRequest')
    next()
  })
  fastify.addHook('onResponse', (res, next) => {
    t.ok('called', 'onResponse')
    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (res) => {
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })
})
