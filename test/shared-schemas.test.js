'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Should expose addSchema function', t => {
  t.plan(1)
  const fastify = Fastify()
  t.is(typeof fastify.addSchema, 'function')
})

test('The schemas should be added to an internal store', t => {
  t.plan(1)
  const fastify = Fastify()

  const schema = { $id: 'id', my: 'schema' }
  fastify.addSchema(schema)
  t.deepEqual(fastify._schemas.store, { id: schema })
})

test('Should throw if the $id property is missing', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.addSchema({ type: 'string' })
  } catch (err) {
    t.is(err.message, 'Missing schema $id property')
  }
})

test('Cannot add multiple times the same id', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({ $id: 'id' })
  try {
    fastify.addSchema({ $id: 'id' })
  } catch (err) {
    t.is(err.message, 'Schema with id \'id\' already declared!')
  }
})

test('Should throw of the schema does not exists', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      params: 'test#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.ready(err => {
    t.is(err.message, 'Schema with id \'test\' does not exist!')
  })
})

test('Should use a stored schema', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      params: 'test#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/123'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'number')
  })
})

test('Should work with nested ids', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.addSchema({
    $id: 'greetings',
    type: 'string'
  })

  fastify.route({
    method: 'POST',
    url: '/:id',
    schema: {
      params: 'test#',
      body: {
        type: 'object',
        properties: {
          hello: 'greetings#'
        }
      }
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/123',
    payload: {
      hello: 'world'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'number')
  })
})

test('Use the same schema across multiple routes', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/first/:id',
    schema: {
      params: 'test#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.route({
    method: 'GET',
    url: '/second/:id',
    schema: {
      params: 'test#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/first/123'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'number')
  })

  fastify.inject({
    method: 'GET',
    url: '/second/123'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'number')
  })
})

test('Encapsulation should not intervene', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addSchema({
      $id: 'test',
      type: 'object',
      properties: {
        id: { type: 'number' }
      }
    })
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.route({
      method: 'GET',
      url: '/:id',
      schema: {
        params: 'test#'
      },
      handler: (req, reply) => {
        reply.send(typeof req.params.id)
      }
    })
    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/123'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'number')
  })
})

test('JSON Schema validation keywords', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      ip: {
        type: 'string',
        format: 'ipv4'
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      params: 'test#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/127.0.0.1'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'string')
  })
})

test('Nested id calls', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      ip: {
        type: 'string',
        format: 'ipv4'
      }
    }
  })

  fastify.addSchema({
    $id: 'hello',
    type: 'object',
    properties: {
      host: 'test#'
    }
  })

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body: 'hello#'
    },
    handler: (req, reply) => {
      reply.send(typeof req.body.host.ip)
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      host: {
        ip: '127.0.0.1'
      }
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'string')
  })
})

test('Use the same schema id in diferent places', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      response: {
        200: {
          type: 'array',
          items: 'test#'
        }
      }
    },
    handler: () => {}
  })

  fastify.route({
    method: 'POST',
    url: '/:id',
    schema: {
      body: 'test#',
      response: {
        200: 'test#'
      }
    },
    handler: () => {}
  })

  fastify.ready(err => {
    t.error(err)
  })
})
