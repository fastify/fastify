'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Example - URI $id', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.addSchema({
    $id: 'http://example.com/',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  fastify.post('/', {
    handler () {},
    schema: {
      body: {
        type: 'array',
        items: { $ref: 'http://example.com#/properties/hello' }
      }
    }
  })

  fastify.ready(err => t.error(err))
})

test('Example - string $id', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.addSchema({
    $id: 'commonSchema',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  fastify.post('/', {
    handler () {},
    schema: {
      body: { $ref: 'commonSchema#' },
      headers: { $ref: 'commonSchema#' }
    }
  })

  fastify.ready(err => t.error(err))
})

test('Example - get schema', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.addSchema({
    $id: 'schemaId',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  const mySchemas = fastify.getSchemas()
  const mySchema = fastify.getSchema('schemaId')
  t.deepEquals(mySchemas.schemaId, mySchema)
})

test('Example - get schema encapsulated', async t => {
  const fastify = Fastify()

  fastify.addSchema({ $id: 'one', my: 'hello' })
  // will return only `one` schema
  fastify.get('/', (request, reply) => { reply.send(fastify.getSchemas()) })

  fastify.register((instance, opts, done) => {
    instance.addSchema({ $id: 'two', my: 'ciao' })
    // will return `one` and `two` schemas
    instance.get('/sub', (request, reply) => { reply.send(instance.getSchemas()) })

    instance.register((subinstance, opts, done) => {
      subinstance.addSchema({ $id: 'three', my: 'hola' })
      // will return `one`, `two` and `three`
      subinstance.get('/deep', (request, reply) => { reply.send(subinstance.getSchemas()) })
      done()
    })
    done()
  })

  const r1 = await fastify.inject('/')
  const r2 = await fastify.inject('/sub')
  const r3 = await fastify.inject('/deep')

  t.deepEquals(Object.keys(r1.json()), ['one'])
  t.deepEquals(Object.keys(r2.json()), ['one', 'two'])
  t.deepEquals(Object.keys(r3.json()), ['one', 'two', 'three'])
})

test('Example - validation', t => {
  t.plan(1)
  const fastify = Fastify()
  const handler = () => {}

  const bodyJsonSchema = {
    type: 'object',
    required: ['requiredKey'],
    properties: {
      someKey: { type: 'string' },
      someOtherKey: { type: 'number' },
      requiredKey: {
        type: 'array',
        maxItems: 3,
        items: { type: 'integer' }
      },
      nullableKey: { type: ['number', 'null'] }, // or { type: 'number', nullable: true }
      multipleTypesKey: { type: ['boolean', 'number'] },
      multipleRestrictedTypesKey: {
        oneOf: [
          { type: 'string', maxLength: 5 },
          { type: 'number', minimum: 10 }
        ]
      },
      enumKey: {
        type: 'string',
        enum: ['John', 'Foo']
      },
      notTypeKey: {
        not: { type: 'array' }
      }
    }
  }

  const queryStringJsonSchema = {
    name: { type: 'string' },
    excitement: { type: 'integer' }
  }

  const paramsJsonSchema = {
    par1: { type: 'string' },
    par2: { type: 'number' }
  }

  const headersJsonSchema = {
    type: 'object',
    properties: {
      'x-foo': { type: 'string' }
    },
    required: ['x-foo']
  }

  const schema = {
    body: bodyJsonSchema,
    querystring: queryStringJsonSchema,
    params: paramsJsonSchema,
    headers: headersJsonSchema
  }

  fastify.post('/the/url', { schema }, handler)
  fastify.ready(err => t.error(err))
})

test('Example - ajv config', t => {
  t.plan(1)

  const fastify = Fastify({
    ajv: {
      plugins: [
        require('ajv-merge-patch')
      ]
    }
  })

  fastify.post('/', {
    handler (req, reply) { reply.send({ ok: 1 }) },
    schema: {
      body: {
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
    }
  })

  fastify.post('/foo', {
    handler (req, reply) { reply.send({ ok: 1 }) },
    schema: {
      body: {
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
    }
  })

  fastify.ready(err => t.error(err))
})

test('Example Joi', t => {
  t.plan(1)
  const fastify = Fastify()
  const handler = () => {}

  const Joi = require('@hapi/joi')
  fastify.post('/the/url', {
    schema: {
      body: Joi.object().keys({
        hello: Joi.string().required()
      }).required()
    },
    validatorCompiler: (method, url, httpPart, schema) => {
      return (data) => Joi.validate(data, schema)
    }
  }, handler)

  fastify.ready(err => t.error(err))
})

test('Example - serialization', t => {
  t.plan(1)
  const fastify = Fastify()
  const handler = () => {}

  const schema = {
    response: {
      200: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          otherValue: { type: 'boolean' }
        }
      }
    }
  }

  fastify.post('/the/url', { schema }, handler)
  fastify.ready(err => t.error(err))
})

test('Example - serialization 2', t => {
  t.plan(1)
  const fastify = Fastify()
  const handler = () => {}

  const schema = {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          value: { type: 'string' },
          otherValue: { type: 'boolean' }
        }
      },
      201: {
        // the contract sintax
        value: { type: 'string' }
      }
    }
  }

  fastify.post('/the/url', { schema }, handler)
  fastify.ready(err => t.error(err))
})

test('Example - serializator', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.setSerializerCompiler((method, url, httpPart, schema) => {
    return data => JSON.stringify(data)
  })

  fastify.get('/user', {
    handler (req, reply) {
      reply.send({ id: 1, name: 'Foo', image: 'BIG IMAGE' })
    },
    schema: {
      response: {
        '2xx': {
          id: { type: 'number' },
          name: { type: 'string' }
        }
      }
    }
  })

  fastify.ready(err => t.error(err))
})

test('Example - schemas examples', t => {
  t.plan(1)
  const fastify = Fastify()
  const handler = () => {}

  fastify.addSchema({
    $id: 'http://foo/common.json',
    type: 'object',
    definitions: {
      foo: {
        $id: '#address',
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    }
  })

  fastify.addSchema({
    $id: 'http://foo/shared.json',
    type: 'object',
    definitions: {
      foo: {
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    }
  })

  const refToId = {
    type: 'object',
    definitions: {
      foo: {
        $id: '#address',
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    },
    properties: {
      home: { $ref: '#address' },
      work: { $ref: '#address' }
    }
  }

  const refToDefinitions = {
    type: 'object',
    definitions: {
      foo: {
        $id: '#address',
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    },
    properties: {
      home: { $ref: '#/definitions/foo' },
      work: { $ref: '#/definitions/foo' }
    }
  }

  const refToSharedSchemaId = {
    type: 'object',
    properties: {
      home: { $ref: 'http://foo/common.json#address' },
      work: { $ref: 'http://foo/common.json#address' }
    }
  }

  const refToSharedSchemaDefinitions = {
    type: 'object',
    properties: {
      home: { $ref: 'http://foo/shared.json#/definitions/foo' },
      work: { $ref: 'http://foo/shared.json#/definitions/foo' }
    }
  }

  fastify.get('/', {
    handler,
    schema: {
      body: refToId,
      headers: refToDefinitions,
      params: refToSharedSchemaId,
      query: refToSharedSchemaDefinitions
    }

  })

  fastify.ready(err => t.error(err))
})
