'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('reply.mediaType should match the content-type header', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.type('application/json')
    t.assert.strictEqual(reply.mediaType, 'application/json')
    reply.send({ mediaType: reply.mediaType })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('reply.mediaType should strip the charset parameter', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.header('content-type', 'application/json; charset=utf-8')
    t.assert.strictEqual(reply.mediaType, 'application/json')
    reply.send({ mediaType: reply.mediaType })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('reply.mediaType should strip the space', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.header('content-type', ' application/json ; charset=utf-8')
    t.assert.strictEqual(reply.mediaType, 'application/json')
    reply.send({ mediaType: reply.mediaType })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('reply.mediaType is undefined when content-type is not set', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    t.assert.strictEqual(reply.mediaType, undefined)
    reply.send({ mediaType: reply.mediaType })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, undefined)
})

test('reply.mediaType supported in hooks', async (t) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', {
    preHandler: (request, reply, done) => {
      reply.type('application/json')
      t.assert.strictEqual(reply.mediaType, 'application/json')
      done()
    },
    preSerialization: (request, reply, payload, done) => {
      t.assert.strictEqual(reply.mediaType, 'application/json')
      done(null, payload)
    },
    onSend: (request, reply, payload, done) => {
      t.assert.strictEqual(reply.mediaType, 'application/json')
      done(null, payload)
    }
  }, (request, reply) => {
    t.assert.strictEqual(reply.mediaType, 'application/json')
    reply.send({ mediaType: reply.mediaType })
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('reply.mediaType should reflect the last type set', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.type('application/json')
    reply.type('text/plain')
    t.assert.strictEqual(reply.mediaType, 'text/plain')
    reply.send(`mediaType = ${reply.mediaType}`)
  })

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const body = response.body
  t.assert.strictEqual(body, 'mediaType = text/plain')
})
