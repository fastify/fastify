'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')()

const schema = {
  schema: { },
  custom: {
    value1: 'foo',
    value2: true
  }
}

function handler (req, reply) {
  reply.serializer(JSON.stringify).send(reply.store.custom)
}

test('custom - get', t => {
  t.plan(1)

  fastify.get('/get', schema, handler)

  t.pass()
})

test('custom - route', t => {
  t.plan(1)

  fastify.route({
    method: 'GET',
    url: '/route',
    schema: schema.schema,
    handler: handler,
    custom: schema.custom
  })
  t.pass()
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('custom - request get', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/get',
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEquals(response.body, schema.custom)
    })
  })

  test('custom - request route', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/route',
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEquals(body, schema.custom)
    })
  })
})
