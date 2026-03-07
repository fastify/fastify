'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')

test('same route definition object on multiple prefixes', async t => {
  t.plan(2)

  const routeObject = {
    handler: () => { },
    method: 'GET',
    url: '/simple'
  }

  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.assert.strictEqual(routeOptions.url, '/v1/simple')
    })
    f.route(routeObject)
  }, { prefix: '/v1' })
  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.assert.strictEqual(routeOptions.url, '/v2/simple')
    })
    f.route(routeObject)
  }, { prefix: '/v2' })

  await fastify.ready()
})

test('path can be specified in place of uri', (t, done) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/path',
    handler: function (req, reply) {
      reply.send({ hello: 'world' })
    }
  })

  const reqOpts = {
    method: 'GET',
    url: '/path'
  }

  fastify.inject(reqOpts, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    done()
  })
})

test('invalid bodyLimit option - route', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.route({
      bodyLimit: false,
      method: 'PUT',
      handler: () => null
    })
    t.assert.fail('bodyLimit must be an integer')
  } catch (err) {
    t.assert.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got 'false'")
  }

  try {
    fastify.post('/url', { bodyLimit: 10000.1 }, () => null)
    t.assert.fail('bodyLimit must be an integer')
  } catch (err) {
    t.assert.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got '10000.1'")
  }
})

test('handler function in options of shorthand route should works correctly', (t, done) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/foo', {
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.assert.ifError(err)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    done()
  })
})

test('route with path alias instead of url', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/test-path',
    handler: (req, reply) => {
      reply.send({ path: 'alias' })
    }
  })

  const res = await fastify.inject({
    method: 'GET',
    url: '/test-path'
  })

  t.assert.deepStrictEqual(JSON.parse(res.payload), { path: 'alias' })
})

test('route defaults to / when neither url nor path is provided', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    handler: (req, reply) => {
      reply.send({ root: true })
    }
  })

  const res = await fastify.inject({
    method: 'GET',
    url: '/'
  })

  t.assert.deepStrictEqual(JSON.parse(res.payload), { root: true })
})
