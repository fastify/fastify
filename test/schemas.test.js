'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const fp = require('fastify-plugin')

const ajvMergePatch = require('ajv-merge-patch')
const AJV = require('ajv')
const fastClone = require('rfdc')({ circles: false, proto: true })

const schemaUsed = {
  $id: 'urn:schema:foo',
  definitions: {
    foo: { type: 'string' }
  },
  type: 'object',
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
}
const schemaParent = {
  $id: 'urn:schema:response',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
}

const schemaRequest = {
  $id: 'urn:schema:request',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:response#/properties/foo' }
  }
}

test('Should use the ref resolver - response', t => {
  t.plan(3)
  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))

  fastify.setSchemaCompiler(schema => ajv.compile(schema))
  fastify.setSchemaResolver((ref) => {
    t.ok(['urn:schema:response', 'urn:schema:foo'].includes(ref))
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      response: {
        '2xx': { $ref: 'urn:schema:response#' }
      }
    },
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.ready(t.error)
})

test('Should use the ref resolver - body', t => {
  t.plan(4)
  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))

  fastify.setSchemaCompiler(schema => ajv.compile(schema))
  fastify.setSchemaResolver((ref) => {
    t.ok(['urn:schema:response', 'urn:schema:foo'].includes(ref))
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body: { $ref: 'urn:schema:response#' }
    },
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
  })
})

test('Encapsulation', t => {
  t.plan(14)
  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))

  fastify.register((instance, opts, next) => {
    instance.setSchemaCompiler(schema => ajv.compile(schema))
    instance.setSchemaResolver((ref) => {
      return ajv.getSchema(ref).schema
    })
    instance.route({
      method: 'POST',
      url: '/',
      schema: {
        body: { $ref: 'urn:schema:response#' }
      },
      handler (req, reply) {
        reply.send({ foo: 'bar' })
      }
    })

    instance.register((instance, opts, next) => {
      instance.route({
        method: 'POST',
        url: '/two',
        schema: {
          body: { $ref: 'urn:schema:response#' }
        },
        handler (req, reply) {
          reply.send({ foo: 'bar' })
        }
      })
      next()
    })
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.route({
      method: 'POST',
      url: '/clean',
      handler (req, reply) {
        reply.send({ foo: 'bar' })
      }
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { foo: 'bar' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
      t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { wrongFoo: 'bar' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/two',
      payload: { foo: 'bar' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
      t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
    })

    fastify.inject({
      method: 'POST',
      url: '/two',
      payload: { wrongFoo: 'bar' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/clean',
      payload: { wrongFoo: 'bar' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
      t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
    })
  })
})

test('Schema resolver without schema compiler', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.setSchemaResolver(() => { t.fail('the schema resolver will never be called') })
  fastify.route({
    method: 'POST',
    url: '/',
    schema: {},
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.ready(err => {
    t.is(err.code, 'FST_ERR_SCH_MISSING_COMPILER')
    t.isLike(err.message, /You must provide a schemaCompiler to route POST \/ to use the schemaResolver/)
  })
})

test('Triple $ref deep', t => {
  t.plan(6)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))
  ajv.addSchema(fastClone(schemaRequest))

  fastify.setSchemaCompiler(schema => ajv.compile(schema))
  fastify.setSchemaResolver((ref) => {
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body: { $ref: 'urn:schema:request#' },
      response: {
        '2xx': { $ref: 'urn:schema:response#' }
      }
    },
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { fool: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 400)
    t.deepEquals(JSON.parse(res.payload).message, "body should have required property 'foo'")
  })
})

test('$ref with a simple $id', t => {
  t.plan(6)
  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(fastClone(schemaUsed))
  ajv.addSchema({
    $id: 'urn:schema:response',
    type: 'object',
    required: ['foo'],
    properties: {
      foo: { $ref: 'urn:schema:foo' }
    }
  })
  ajv.addSchema({
    $id: 'urn:schema:request',
    type: 'object',
    required: ['foo'],
    properties: {
      foo: { $ref: 'urn:schema:foo' }
    }
  })

  fastify.setSchemaCompiler(schema => ajv.compile(schema))
  fastify.setSchemaResolver((ref) => {
    t.ok(['urn:schema:request', 'urn:schema:response', 'urn:schema:foo'].includes(ref))
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body: { $ref: 'urn:schema:request#' },
      response: {
        '2xx': { $ref: 'urn:schema:response#' }
      }
    },
    handler (req, reply) {
      reply.send({ foo: { foo: 'bar', bar: 'foo' } })
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: { foo: 'bar' } }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(JSON.parse(res.payload), { foo: { foo: 'bar' } })
  })
})

test('Should handle root $merge keywords in header', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      plugins: [
        ajvMergePatch
      ]
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      headers: {
        $merge: {
          source: {
            type: 'object',
            properties: {
              q: {
                type: 'string'
              }
            }
          },
          with: {
            required: ['q']
          }
        }
      }
    },
    handler (req, reply) {
      reply.send({ ok: 1 })
    }
  })

  fastify.ready(err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        q: 'foo'
      }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
    })
  })
})

test('Should handle root $patch keywords in header', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      plugins: [
        ajvMergePatch
      ]
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      headers: {
        $patch: {
          source: {
            type: 'object',
            properties: {
              q: {
                type: 'string'
              }
            }
          },
          with: [
            {
              op: 'add',
              path: '/properties/q',
              value: { type: 'number' }
            }
          ]
        }
      }
    },
    handler (req, reply) {
      reply.send({ ok: 1 })
    }
  })

  fastify.ready(err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        q: 'foo'
      }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: {
        q: 10
      }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
    })
  })
})

test('Add schema order should not break the startup', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/', { schema: { random: 'options' } }, () => {})

  fastify.register(fp((f, opts) => {
    f.addSchema({
      $id: 'https://example.com/bson/objectId',
      type: 'string',
      pattern: '\\b[0-9A-Fa-f]{24}\\b'
    })
    return Promise.resolve() // avoid async for node 6
  }))

  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { $ref: 'https://example.com/bson/objectId#' }
        }
      }
    }
  }, () => {})

  fastify.ready(err => { t.error(err) })
})
