'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('custom validatorCompiler returning falsy values should update request param', async (t) => {
  const fastify = Fastify()

  fastify.setValidatorCompiler(() => {
    return (data) => {
      if (typeof data === 'object' && data !== null && 'coerceTo' in data) {
        return { value: data.coerceTo }
      }
      return true
    }
  })

  fastify.post('/test', { schema: { body: { type: 'object' } } }, (request, reply) => {
    reply.send({ body: request.body })
  })

  // value: 0 (falsy)
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: 0 }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).body, 0, 'should update body to 0')
  }

  // value: "" (falsy)
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: '' }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).body, '', 'should update body to empty string')
  }

  // value: false (falsy)
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: false }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).body, false, 'should update body to false')
  }

  // value: null (falsy)
  {
    const res = await fastify.inject({
      method: 'POST',
      url: '/test',
      payload: { coerceTo: null }
    })
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(JSON.parse(res.payload).body, null, 'should update body to null')
  }
})
