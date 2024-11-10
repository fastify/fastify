'use strict'

const Fastify = require('..')
const sget = require('simple-get').concat
const { test } = require('node:test')

test('proto-poisoning error', (t, done) => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', (request, reply) => {
    t.assert.fail('handler should not be called')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 } }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      fastify.close()
      done()
    })
  })
})

test('proto-poisoning remove', (t, done) => {
  t.plan(4)

  const fastify = Fastify({ onProtoPoisoning: 'remove' })

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(undefined, Object.assign({}, request.body).a)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 }, "b": 42 }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      fastify.close()
      done()
    })
  })
})

test('proto-poisoning ignore', (t, done) => {
  t.plan(4)

  const fastify = Fastify({ onProtoPoisoning: 'ignore' })

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(42, Object.assign({}, request.body).a)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 }, "b": 42 }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      fastify.close()
      done()
    })
  })
})

test('constructor-poisoning error (default in v3)', (t, done) => {
  t.plan(3)

  const fastify = Fastify()

  fastify.post('/', (request, reply) => {
    reply.send('ok')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      fastify.close()
      done()
    })
  })
})

test('constructor-poisoning error', (t, done) => {
  t.plan(3)

  const fastify = Fastify({ onConstructorPoisoning: 'error' })

  fastify.post('/', (request, reply) => {
    t.assert.fail('handler should not be called')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 400)
      fastify.close()
      done()
    })
  })
})

test('constructor-poisoning remove', (t, done) => {
  t.plan(4)

  const fastify = Fastify({ onConstructorPoisoning: 'remove' })

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(undefined, Object.assign({}, request.body).foo)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      fastify.close()
      done()
    })
  })
})
