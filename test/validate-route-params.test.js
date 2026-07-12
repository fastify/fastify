'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('validateRouteParams - should not throw when params match schema', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          artistId: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({ artistId: req.params.artistId })
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - should throw when schema has a param not in route path', async (t) => {
  t.plan(2)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          artistId: { type: 'string' },
          albumId: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.ok(err.message.includes('albumId'))
      return true
    }
  )
  await fastify.close()
})

test('validateRouteParams - should throw when route path has a param not in schema', async (t) => {
  t.plan(2)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId/albums/:albumId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          artistId: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.rejects(
    fastify.ready(),
    (err) => {
      t.assert.ok(err.message.includes('albumId'))
      return true
    }
  )
  await fastify.close()
})

test('validateRouteParams - should not validate when no schema is present', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId', {
    handler: (req, reply) => reply.send({})
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - should not validate when schema has no params', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - disabled by default', async (t) => {
  t.plan(1)

  // Should not throw even with mismatched params because validation is disabled
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          artistId: { type: 'string' },
          unknownParam: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - should work with multiple routes', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/artists/:artistId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          artistId: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  fastify.get('/albums/:albumId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          albumId: { type: 'string' }
        }
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - should handle routes without dynamic params and no schema params', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  fastify.get('/health', {
    handler: (req, reply) => reply.send({ status: 'ok' })
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})

test('validateRouteParams - should not validate when schema.params has no properties', async (t) => {
  t.plan(1)

  const fastify = Fastify({ validateRouteParams: true })

  // Schema params defined without explicit properties (e.g. just a type) - skip validation
  fastify.get('/artists/:artistId', {
    schema: {
      params: {
        type: 'object'
      }
    },
    handler: (req, reply) => reply.send({})
  })

  await t.assert.doesNotReject(fastify.ready())
  await fastify.close()
})
