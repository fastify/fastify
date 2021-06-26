'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

const schema = {
  schema: { },
  config: {
    value1: 'foo',
    value2: true
  }
}

function handler (req, reply) {
  reply.send(reply.context.config)
}

test('config', t => {
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
    handler: handler,
    config: Object.assign({}, schema.config)
  })

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler: handler
  })

  fastify.inject({
    method: 'GET',
    url: '/get'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), Object.assign({ url: '/get', method: 'GET' }, schema.config))
  })

  fastify.inject({
    method: 'GET',
    url: '/route'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  })

  fastify.inject({
    method: 'GET',
    url: '/no-config'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), { url: '/no-config', method: 'GET' })
  })
})

test('config with exposeHeadRoutes', t => {
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
    handler: handler,
    config: Object.assign({}, schema.config)
  })

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler: handler
  })

  fastify.inject({
    method: 'GET',
    url: '/get'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), Object.assign({ url: '/get', method: 'GET' }, schema.config))
  })

  fastify.inject({
    method: 'GET',
    url: '/route'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), Object.assign({ url: '/route', method: 'GET' }, schema.config))
  })

  fastify.inject({
    method: 'GET',
    url: '/no-config'
  }, (err, response) => {
    t.error(err)
    t.equal(response.statusCode, 200)
    t.same(JSON.parse(response.payload), { url: '/no-config', method: 'GET' })
  })
})
