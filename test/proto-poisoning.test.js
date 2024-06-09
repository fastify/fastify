'use strict'

const Fastify = require('..')
const sget = require('simple-get').concat
const t = require('tap')
const test = t.test

test('proto-poisoning error', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    t.fail('handler should not be called')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 } }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
    })
  })
})

test('proto-poisoning remove', t => {
  t.plan(4)

  const fastify = Fastify({ onProtoPoisoning: 'remove' })
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    t.equal(undefined, Object.assign({}, request.body).a)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 }, "b": 42 }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

test('proto-poisoning ignore', t => {
  t.plan(4)

  const fastify = Fastify({ onProtoPoisoning: 'ignore' })
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    t.equal(42, Object.assign({}, request.body).a)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "__proto__": { "a": 42 }, "b": 42 }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})

test('constructor-poisoning error (default in v3)', t => {
  t.plan(3)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    reply.send('ok')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
    })
  })
})

test('constructor-poisoning error', t => {
  t.plan(3)

  const fastify = Fastify({ onConstructorPoisoning: 'error' })
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    t.fail('handler should not be called')
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
    })
  })
})

test('constructor-poisoning remove', t => {
  t.plan(4)

  const fastify = Fastify({ onConstructorPoisoning: 'remove' })
  t.teardown(fastify.close.bind(fastify))

  fastify.post('/', (request, reply) => {
    t.equal(undefined, Object.assign({}, request.body).foo)
    reply.send({ ok: true })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: '{ "constructor": { "prototype": { "foo": "bar" } } }'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})
