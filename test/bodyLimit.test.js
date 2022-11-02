'use strict'

const Fastify = require('..')
const sget = require('simple-get').concat
const t = require('tap')
const test = t.test

test('bodyLimit', t => {
  t.plan(10)

  try {
    Fastify({ bodyLimit: 1.3 })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    Fastify({ bodyLimit: [] })
    t.fail('option must be an integer')
  } catch (err) {
    t.ok(err)
  }

  const fastify = Fastify({ bodyLimit: 1 })

  fastify.post('/', (request, reply) => {
    reply.send({ error: 'handler should not be called' })
  })

  fastify.post('/route-limit', {
    bodyLimit: 1000,
    handler (request, reply) {
      t.equal(1000, request.routeBodyLimit)
      reply.send({ error: 'handler should not be called' })
    }
  })

  fastify.post('/server-limit', {
    handler (request, reply) {
      t.equal(1, request.routeBodyLimit)
      reply.send({ error: 'handler should not be called' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 413)
    })
    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/route-limit',
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/server-limit',
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 413)
    })
  })
})

test('default request.routeBodyLimit should be 1048576', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.post('/default-bodylimit', {
    handler (request, reply) {
      t.equal(1048576, request.routeBodyLimit)
      reply.send({ error: 'handler should not be called' })
    }
  })
  fastify.listen({ port: 30 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port + '/default-bodylimit',
      headers: { 'Content-Type': 'application/json' },
      body: [],
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})
