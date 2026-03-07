'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('validator compiler should correctly update with falsy values (0, "", false)', async (t) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.setValidatorCompiler(() => {
    return (data) => {
      // Simulate coercion from a truthy object to a falsy primitive
      if (data && data.coerceTo === 'zero') return { value: 0 }
      if (data && data.coerceTo === 'empty') return { value: '' }
      if (data && data.coerceTo === 'false') return { value: false }
      return { value: data }
    }
  })

  // We need a schema for the validator compiler to be used
  fastify.post('/test', { schema: { body: { type: 'object' } } }, (request, reply) => {
    reply.send({ val: request.body })
  })

  // Test with 0
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: 'zero' }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, 0)
  }

  // Test with ""
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: 'empty' }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, '')
  }

  // Test with false
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: 'false' }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).val, false)
  }
})
