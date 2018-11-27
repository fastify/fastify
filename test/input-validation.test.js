'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

test('case insensitive header validation', t => {
  t.plan(2)
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.code(200).send(req.headers.foobar)
    },
    schema: {
      headers: {
        type: 'object',
        required: ['FooBar'],
        properties: {
          FooBar: { type: 'string' }
        }
      }
    }
  })
  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'FooBar': 'Baz'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, 'Baz')
  })
})
