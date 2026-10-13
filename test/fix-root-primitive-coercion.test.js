'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('root primitive values coerced by Ajv are assigned to the request', async (t) => {
  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: {
        type: 'integer',
        minimum: 1,
        maximum: 10
      }
    }
  }, (request, reply) => {
    reply.send({ body: request.body, type: typeof request.body })
  })

  const response = await fastify.inject({
    method: 'POST',
    url: '/',
    payload: '"10"',
    headers: { 'content-type': 'application/json' }
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(response.payload), {
    body: 10,
    type: 'number'
  })

  await fastify.close()
})
