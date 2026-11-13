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

test('request.mediaType does not throw when a custom header parser throws in a deferred hook', async (t) => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())
  fastify.setContentTypeHeaderParser(() => {
    throw new Error('header parser boom')
  })

  fastify.addHook('onRequest', (request, reply, done) => {
    setImmediate(() => {
      try {
        t.assert.strictEqual(request.mediaType, undefined)
      } catch (error) {
        done(error)
        return
      }
      done()
    })
  })
  fastify.get('/', () => 'ok')

  const response = await fastify.inject({
    method: 'GET',
    url: '/',
    headers: { 'content-type': 'text/plain' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.body, 'ok')
})

test('request.mediaType returns undefined for non-object header parser results', async (t) => {
  for (const result of [undefined, null, false, 0, 'text/plain', Symbol('invalid'), 1n, () => {}]) {
    await t.test(result === null ? 'null' : typeof result, async (t) => {
      t.plan(3)

      const fastify = Fastify()
      t.after(() => fastify.close())
      fastify.setContentTypeHeaderParser(() => result)
      fastify.get('/', (request, reply) => {
        t.assert.strictEqual(request.mediaType, undefined)
        reply.send('ok')
      })

      const response = await fastify.inject({
        method: 'GET',
        url: '/',
        headers: { 'content-type': 'text/plain' }
      })

      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.body, 'ok')
    })
  }
})
