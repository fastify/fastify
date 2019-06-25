'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('nullable string', t => {
  t.plan(3)
  const fastify = Fastify()
  fastify.route({
    method: 'POST',
    url: '/',
    handler: (req, reply) => {
      t.same(req.body.hello, null)
      reply.code(200).send(req.body)
    },
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: {
            type: 'string',
            format: 'email',
            nullable: true
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {
              type: 'string',
              format: 'email',
              nullable: true
            }
          }
        }
      }
    }
  })
  fastify.inject({
    method: 'POST',
    url: '/',
    body: {
      hello: null
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.payload.hello, null)
  })
})
