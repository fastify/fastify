'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('request.mediaType should match the content-type header', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(request.mediaType, 'application/json')
    reply.send({ mediaType: request.mediaType })
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'content-type': 'application/json'
    }
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('request.mediaType should strip the charset parameter', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(request.mediaType, 'application/json')
    reply.send({ mediaType: request.mediaType })
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'content-type': 'application/json; charset=utf-8'
    }
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('request.mediaType should strip the space', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.post('/', (request, reply) => {
    t.assert.strictEqual(request.mediaType, 'application/json')
    reply.send({ mediaType: request.mediaType })
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'content-type': ' application/json ; charset=utf-8'
    }
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})

test('request.mediaType supported in hooks', async (t) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', {
    preParsing: (request, reply, payload, done) => {
      t.assert.strictEqual(request.mediaType, 'application/json')
      done(null, payload)
    },
    preValidation: (request, reply, done) => {
      t.assert.strictEqual(request.mediaType, 'application/json')
      done()
    },
    preHandler: (request, reply, done) => {
      t.assert.strictEqual(request.mediaType, 'application/json')
      done()
    }
  }, (request, reply) => {
    t.assert.strictEqual(request.mediaType, 'application/json')
    reply.send({ mediaType: request.mediaType })
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    body: JSON.stringify({ hello: 'world' }),
    headers: {
      'content-type': 'application/json'
    }
  })
  const body = await response.json()
  t.assert.strictEqual(body.mediaType, 'application/json')
})
