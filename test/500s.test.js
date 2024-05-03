'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const symbols = require('../lib/symbols.js')

test('default 500', t => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500', t => {
  t.plan(6)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, request, reply) {
    t.type(request, 'object')
    t.type(request, fastify[symbols.kRequest].parent)
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
    t.equal(res.statusCode, 500)
    t.equal(res.headers['content-type'], 'text/plain')
    t.same(res.payload.toString(), 'an error happened: kaboom')
  })
})

test('encapsulated 500', t => {
  t.plan(10)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.register(function (f, opts, done) {
    f.get('/', function (req, reply) {
      reply.send(new Error('kaboom'))
    })

    f.setErrorHandler(function (err, request, reply) {
      t.type(request, 'object')
      t.type(request, fastify[symbols.kRequest].parent)
      reply
        .code(500)
        .type('text/plain')
        .send('an error happened: ' + err.message)
    })

    done()
  }, { prefix: 'test' })

  fastify.inject({
    method: 'GET',
    url: '/test'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(res.headers['content-type'], 'text/plain')
    t.same(res.payload.toString(), 'an error happened: kaboom')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})

test('custom 500 with hooks', t => {
  t.plan(7)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, request, reply) {
    reply
      .code(500)
      .type('text/plain')
      .send('an error happened: ' + err.message)
  })

  fastify.addHook('onSend', (req, res, payload, done) => {
    t.ok('called', 'onSend')
    done()
  })
  fastify.addHook('onRequest', (req, res, done) => {
    t.ok('called', 'onRequest')
    done()
  })
  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called', 'onResponse')
    done()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.equal(res.headers['content-type'], 'text/plain')
    t.same(res.payload.toString(), 'an error happened: kaboom')
  })
})

test('cannot set errorHandler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    try {
      fastify.setErrorHandler(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('cannot set childLoggerFactory after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    try {
      fastify.setChildLoggerFactory(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('catch synchronous errors', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.setErrorHandler((_, req, reply) => {
    throw new Error('kaboom2')
  })

  fastify.post('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ hello: 'world' }).substring(0, 5)
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.same(res.json(), {
      error: 'Internal Server Error',
      message: 'kaboom2',
      statusCode: 500
    })
  })
})
