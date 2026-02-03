'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('validator compiler should correctly update with falsy values (0, "", false)', async (t) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.setValidatorCompiler(() => {
    return (data) => {
      // Return the data as value, even if it is falsy
      return { value: data }
    }
  })

  fastify.post('/test', {
    schema: {
      body: {
        type: 'object',
        properties: {
          val: { type: 'number' }
        }
      }
    }
  }, (request, reply) => {
    reply.send({ val: request.body.val })
  })

  // Test with ""
  fastify.post('/test-string', {
    schema: {
      body: {
        type: 'object',
        properties: {
          val: { type: 'string' }
        }
      }
    }
  }, (request, reply) => {
    reply.send({ val: request.body.val })
  })

  // Test with false
  fastify.post('/test-boolean', {
    schema: {
      body: {
        type: 'object',
        properties: {
          val: { type: 'boolean' }
        }
      }
    }
  }, (request, reply) => {
    reply.send({ val: request.body.val })
  })

  // Test with 0
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { val: 0 }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, 0)
  }

  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test-string',
      payload: { val: '' }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, '')
  }

  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test-boolean',
      payload: { val: false }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, false)
  }
})
