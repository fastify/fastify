'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const symbols = require('../lib/symbols.js')

test('default 500', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, request, reply) {
    t.type(request, 'object')
    t.type(request, fastify[symbols.kRequest])
    reply
      .code(500)
      .type('text/plain')
      .send('an error happened: ' + err.message)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })
})

test('encapsulated 500', t => {
  t.plan(10)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.register(function (f, opts, next) {
    f.get('/', function (req, reply) {
      reply.send(new Error('kaboom'))
    })

    f.setErrorHandler(function (err, request, reply) {
      t.type(request, 'object')
      t.type(request, f[symbols.kRequest])
      reply
        .code(500)
        .type('text/plain')
        .send('an error happened: ' + err.message)
    })

    next()
  }, { prefix: 'test' })

  fastify.inject({
    method: 'GET',
    url: '/test'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500 with hooks', t => {
  t.plan(7)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, request, reply) {
    reply
      .code(500)
      .type('text/plain')
      .send('an error happened: ' + err.message)
  })

  fastify.addHook('onSend', (req, res, payload, next) => {
    t.ok('called', 'onSend')
    next()
  })
  fastify.addHook('onRequest', (req, res, next) => {
    t.ok('called', 'onRequest')
    next()
  })
  fastify.addHook('onResponse', (request, reply, next) => {
    t.ok('called', 'onResponse')
    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.deepEqual(res.payload.toString(), 'an error happened: kaboom')
  })
})

test('cannot set errorHandler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.setErrorHandler(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})
