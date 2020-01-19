'use strict'

const t = require('tap')
// const Joi = require('@hapi/joi')
const Fastify = require('..')
const test = t.test

test('basic test', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            name: { type: 'string' },
            work: { type: 'string' }
          }
        }
      }
    }
  }, function (req, reply) {
    reply.code(200).send({ name: 'Foo', work: 'Bar', nick: 'Boo' })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.deepEqual(res.json(), { name: 'Foo', work: 'Bar' })
    t.strictEqual(res.statusCode, 200)
  })
})
