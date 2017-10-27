'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

const schema = {
  schema: { },
  config: {
    value1: 'foo',
    value2: true
  }
}

function handler (req, reply) {
  reply.serializer(JSON.stringify).send(reply.store.config)
}

test('config - get', t => {
  t.plan(1)

  fastify.get('/get', {
    schema: schema.schema,
    config: Object.assign({}, schema.config)
  }, handler)

  t.pass()
})

test('config - route', t => {
  t.plan(1)

  fastify.route({
    method: 'GET',
    url: '/route',
    schema: schema.schema,
    handler: handler,
    config: Object.assign({}, schema.config)
  })
  t.pass()
})

test('config - no config', t => {
  t.plan(1)

  fastify.route({
    method: 'GET',
    url: '/no-config',
    schema: schema.schema,
    handler: handler
  })
  t.pass()
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('config - request get', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/get',
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEquals(body, Object.assign({url: '/get'}, schema.config))
    })
  })

  test('config - request route', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/route',
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEquals(body, Object.assign({url: '/route'}, schema.config))
    })
  })

  test('config - request no-config', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no-config',
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEquals(body, {url: '/no-config'})
    })
  })
})
