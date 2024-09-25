'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const symbols = require('../lib/symbols.js')

test('default 500', async t => {
  t.plan(4)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  await new Promise((resolve, reject) => {
    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(JSON.parse(res.payload), {
        error: 'Internal Server Error',
        message: 'kaboom',
        statusCode: 500
      })
      resolve()
    })
  })
})

test('custom 500', async t => {
  t.plan(6)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.setErrorHandler(function (err, request, reply) {
    t.assert.ok(typeof request === 'object')
    t.assert.ok(request instanceof fastify[symbols.kRequest].parent)
    reply
      .code(500)
      .type('text/plain')
      .send('an error happened: ' + err.message)
  })

  await new Promise((resolve, reject) => {
    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.strictEqual(res.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(res.payload.toString(), 'an error happened: kaboom')
      resolve()
    })
  })
})

test('encapsulated 500', async t => {
  t.plan(10)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  fastify.register(function (f, opts, done) {
    f.get('/', function (req, reply) {
      reply.send(new Error('kaboom'))
    })

    f.setErrorHandler(function (err, request, reply) {
      t.assert.ok(typeof request === 'object')
      t.assert.ok(request instanceof fastify[symbols.kRequest].parent)
      reply
        .code(500)
        .type('text/plain')
        .send('an error happened: ' + err.message)
    })

    done()
  }, { prefix: 'test' })

  const promise1 = new Promise((resolve, reject) => {
    fastify.inject({
      method: 'GET',
      url: '/test'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.strictEqual(res.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(res.payload.toString(), 'an error happened: kaboom')
      resolve()
    })
  })

  const promise2 = new Promise((resolve, reject) => {
    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
      t.assert.deepStrictEqual(JSON.parse(res.payload), {
        error: 'Internal Server Error',
        message: 'kaboom',
        statusCode: 500
      })
      resolve()
    })
  })
  await Promise.all([promise1, promise2])
})

test('custom 500 with hooks', async t => {
  t.plan(7)

  const fastify = Fastify()
  t.after(() => fastify.close())

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
    t.assert.ok('called', 'onSend')
    done()
  })
  fastify.addHook('onRequest', (req, res, done) => {
    t.assert.ok('called', 'onRequest')
    done()
  })
  fastify.addHook('onResponse', (request, reply, done) => {
    t.assert.ok('called', 'onResponse')
    done()
  })

  await new Promise((resolve, reject) => {
    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.strictEqual(res.headers['content-type'], 'text/plain')
      t.assert.deepStrictEqual(res.payload.toString(), 'an error happened: kaboom')
      resolve()
    })
  })
})

test('cannot set errorHandler after binding', async t => {
  t.plan(2)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await new Promise((resolve) => {
    fastify.listen({ port: 0 }, err => {
      t.assert.ifError(err)

      try {
        fastify.setErrorHandler(() => { })
        t.assert.fail()
      } catch (e) {
        t.assert.ok(true)
      } finally {
        resolve()
      }
    })
  })
})

test('cannot set childLoggerFactory after binding', async t => {
  t.plan(2)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await new Promise((resolve) => {
    fastify.listen({ port: 0 }, err => {
      t.assert.ifError(err)

      try {
        fastify.setChildLoggerFactory(() => { })
        t.assert.fail()
      } catch (e) {
        t.assert.ok(true)
      } finally {
        resolve()
      }
    })
  })
})

test('catch synchronous errors', async t => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.setErrorHandler((_, req, reply) => {
    throw new Error('kaboom2')
  })

  fastify.post('/', function (req, reply) {
    reply.send(new Error('kaboom'))
  })

  await new Promise((resolve) => {
    fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ hello: 'world' }).substring(0, 5)
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 500)
      t.assert.deepStrictEqual(res.json(), {
        error: 'Internal Server Error',
        message: 'kaboom2',
        statusCode: 500
      })
      resolve()
    })
  })
})
