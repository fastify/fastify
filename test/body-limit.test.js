'use strict'

const Fastify = require('../fastify')
const zlib = require('node:zlib')
const { test } = require('node:test')

test('bodyLimit', async t => {
  t.plan(4)

  try {
    Fastify({ bodyLimit: 1.3 })
    t.assert.fail('option must be an integer')
  } catch (err) {
    t.assert.ok(err)
  }

  try {
    Fastify({ bodyLimit: [] })
    t.assert.fail('option must be an integer')
  } catch (err) {
    t.assert.ok(err)
  }

  const fastify = Fastify({ bodyLimit: 1 })

  fastify.post('/', (request, reply) => {
    reply.send({ error: 'handler should not be called' })
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([])
  })

  t.assert.ok(!result.ok)
  t.assert.strictEqual(result.status, 413)
})

test('bodyLimit is applied to decoded content', async (t) => {
  t.plan(6)

  const body = { x: 'x'.repeat(30000) }
  const json = JSON.stringify(body)
  const encoded = zlib.gzipSync(json)

  const fastify = Fastify()

  fastify.addHook('preParsing', async (req, reply, payload) => {
    t.assert.strictEqual(req.headers['content-length'], `${encoded.length}`)
    const unzip = zlib.createGunzip()
    Object.defineProperty(unzip, 'receivedEncodedLength', {
      get () {
        return unzip.bytesWritten
      }
    })
    payload.pipe(unzip)
    return unzip
  })

  fastify.post('/body-limit-40k', {
    bodyLimit: 40000,
    onError: async (req, res, err) => {
      t.fail('should not be called')
    }
  }, (request, reply) => {
    reply.send({ x: request.body.x })
  })

  fastify.post('/body-limit-20k', {
    bodyLimit: 20000,
    onError: async (req, res, err) => {
      t.assert.strictEqual(err.code, 'FST_ERR_CTP_BODY_TOO_LARGE')
      t.assert.strictEqual(err.statusCode, 413)
    }
  }, (request, reply) => {
    reply.send({ x: 'handler should not be called' })
  })

  await t.test('bodyLimit 40k', async (t) => {
    const result = await fastify.inject({
      method: 'POST',
      url: '/body-limit-40k',
      headers: {
        'content-encoding': 'gzip',
        'content-type': 'application/json'
      },
      payload: encoded
    })
    t.assert.strictEqual(result.statusCode, 200)
    t.assert.deepStrictEqual(result.json(), body)
  })

  await t.test('bodyLimit 20k', async (t) => {
    const result = await fastify.inject({
      method: 'POST',
      url: '/body-limit-20k',
      headers: {
        'content-encoding': 'gzip',
        'content-type': 'application/json'
      },
      payload: encoded
    })
    t.assert.strictEqual(result.statusCode, 413)
  })
})

test('default request.routeOptions.bodyLimit should be 1048576', async t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.post('/default-bodylimit', {
    handler (request, reply) {
      t.assert.strictEqual(1048576, request.routeOptions.bodyLimit)
      reply.send({ })
    }
  })
  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/default-bodylimit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([])
  })
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
})

test('request.routeOptions.bodyLimit should be equal to route limit', async t => {
  t.plan(3)
  const fastify = Fastify({ bodyLimit: 1 })
  fastify.post('/route-limit', {
    bodyLimit: 1000,
    handler (request, reply) {
      t.assert.strictEqual(1000, request.routeOptions.bodyLimit)
      reply.send({})
    }
  })
  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/route-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([])
  })
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
})

test('request.routeOptions.bodyLimit should be equal to server limit', async t => {
  t.plan(3)
  const fastify = Fastify({ bodyLimit: 100 })
  fastify.post('/server-limit', {
    handler (request, reply) {
      t.assert.strictEqual(100, request.routeOptions.bodyLimit)
      reply.send({})
    }
  })
  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/server-limit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([])
  })
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
})
