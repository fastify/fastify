'use strict'

const { test } = require('node:test')
const Fastify = require('..')

process.removeAllListeners('warning')

test('lifecycle hooks should not run when reply.send() is called without await in an async onRequest hook', async (t) => {
  const fastify = Fastify()
  const called = []

  fastify.addHook('onRequest', async (request, reply) => {
    // not awaited / not returned on purpose, see fastify/fastify#4374
    reply.code(200).send('hello')
  })

  // keep reply.send() in-flight so the lifecycle would otherwise continue
  // while the payload is being produced
  fastify.addHook('onSend', async (request, reply, payload) => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return payload
  })

  fastify.addHook('preParsing', async (request, reply, payload) => {
    called.push('preParsing')
    return payload
  })

  fastify.addHook('preValidation', async (request, reply) => {
    called.push('preValidation')
  })

  fastify.addHook('preHandler', async (request, reply) => {
    called.push('preHandler')
  })

  fastify.get('/', async (request, reply) => {
    called.push('handler')
    return 'should not be used'
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })

  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload, 'hello')
  t.assert.deepStrictEqual(called, [])
})

test('lifecycle should not continue while an unawaited reply.send() is serializing in an async onRequest hook', async (t) => {
  const fastify = Fastify()
  const called = []

  fastify.addHook('onRequest', async (request, reply) => {
    // not awaited / not returned on purpose, see fastify/fastify#4374
    reply.code(200).send({ hello: 'world' })
  })

  // keep reply.send() in-flight through the (async) preSerialization step
  fastify.addHook('preSerialization', async (request, reply, payload) => {
    await new Promise((resolve) => setTimeout(resolve, 10))
    return payload
  })

  fastify.addHook('preParsing', async (request, reply, payload) => {
    called.push('preParsing')
    return payload
  })

  fastify.get('/', async (request, reply) => {
    called.push('handler')
    return { shouldNotBeUsed: true }
  })

  const res = await fastify.inject({ method: 'GET', url: '/' })

  t.assert.strictEqual(res.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
  t.assert.deepStrictEqual(called, [])
})
