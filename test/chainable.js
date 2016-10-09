'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

const noop = () => {}
const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

test('chainable - get', t => {
  t.plan(1)
  t.type(fastify.get('/', schema, noop), fastify)
})

test('chainable - post', t => {
  t.plan(1)
  t.type(fastify.post('/', schema, noop), fastify)
})

test('chainable - route', t => {
  t.plan(1)
  t.type(fastify.route({
    method: 'GET',
    url: '/other',
    schema: schema,
    handler: noop
  }), fastify)
})
