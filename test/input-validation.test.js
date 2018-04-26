'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

test('case insensitive header validation', async t => {
  t.plan(1)
  try {
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
    const res = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        'FooBar': 'Baz'
      }
    })
    t.equal(res.payload, 'Baz')
  } catch (err) {
    t.error(err)
  }
})
