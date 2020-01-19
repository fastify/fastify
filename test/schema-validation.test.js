'use strict'

const { test } = require('tap')
const Fastify = require('..')
const symbols = require('../lib/symbols.js')

test('basic test', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          work: { type: 'string' }
        },
        required: ['name', 'work']
      }
    }
  }, function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'sculptor, painter, architect and poet'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.payload, 'michelangelo')
    t.strictEqual(res.statusCode, 200)
  })
})
