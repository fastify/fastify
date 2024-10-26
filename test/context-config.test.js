'use strict'

const { test } = require('node:test')

const { kRouteContext } = require('../lib/symbols')
const Fastify = require('..')

const schema = {
  schema: { },
  config: {
    value1: 'foo',
    value2: true
  }
}

function handler (req, reply) {
  reply.send(reply[kRouteContext].config)
}

test('config', async t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.get('/get', {
    schema: schema.schema,
    config: Object.assign({}, schema.config)
  }, handler)

  fastify.route({
    method: 'GET',
    url: '/route',
    schema: schema.schema,
    handler,
    config: Object.assign({}, schema.config)
  })

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler
  })

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/route'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/route'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/no-config'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), { url: '/no-config', method: 'GET' })
  }
})

test('config with exposeHeadRoutes', async t => {
  t.plan(9)
  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.get('/get', {
    schema: schema.schema,
    config: Object.assign({}, schema.config)
  }, handler)

  fastify.route({
    method: 'GET',
    url: '/route',
    schema: schema.schema,
    handler,
    config: Object.assign({}, schema.config)
  })

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler
  })

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/get'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/get', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/route'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/no-config'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), { url: '/no-config', method: 'GET' })
  }
})

test('config without exposeHeadRoutes', async t => {
  t.plan(9)
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.get('/get', {
    schema: schema.schema,
    config: Object.assign({}, schema.config)
  }, handler)

  fastify.route({
    method: 'GET',
    url: '/route',
    schema: schema.schema,
    handler,
    config: Object.assign({}, schema.config)
  })

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler
  })

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/get'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/get', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/route'
    })
    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  }

  {
    const response = await fastify.inject({
      method: 'GET',
      url: '/no-config'
    })

    t.assert.ifError(response.error)
    t.assert.equal(response.statusCode, 200)
    t.assert.deepStrictEqual(JSON.parse(response.payload), { url: '/no-config', method: 'GET' })
  }
})
