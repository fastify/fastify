'use strict'

const { test } = require('tap')
const AJV = require('ajv')
const Fastify = require('..')
const ajvMergePatch = require('ajv-merge-patch')

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
              q: { type: 'string' }
            }
          },
          with: { required: ['q'] }
        }
      }
    },
    handler (req, reply) { reply.send({ ok: 1 }) }
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
      headers: { q: 'foo' }
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
              q: { type: 'string' }
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
    handler (req, reply) { reply.send({ ok: 1 }) }
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
      headers: { q: 10 }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
    })
  })
})

test('Should handle $merge keywords in body', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      plugins: [ajvMergePatch]
    }
  })

  fastify.post('/', {
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
    },
    handler (req, reply) { reply.send({ ok: 1 }) }
  })

  fastify.ready(err => {
    t.error(err)

    fastify.inject({
      method: 'POST',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { q: 'foo' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
    })
  })
})

test('Should handle $patch keywords in body', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      plugins: [ajvMergePatch]
    }
  })

  fastify.post('/', {
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
    },
    handler (req, reply) { reply.send({ ok: 1 }) }
  })

  fastify.ready(err => {
    t.error(err)

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { q: 'foo' }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { q: 10 }
    }, (err, res) => {
      t.error(err)
      t.equals(res.statusCode, 200)
    })
  })
})

test("serializer read validator's schemas", t => {
  t.plan(4)
  const ajvInstance = new AJV()

  const baseSchema = {
    $id: 'http://example.com/schemas/base',
    definitions: {
      hello: { type: 'string' }
    },
    type: 'object',
    properties: {
      hello: { $ref: '#/definitions/hello' }
    }
  }

  const refSchema = {
    $id: 'http://example.com/schemas/ref',
    type: 'object',
    properties: {
      hello: { $ref: 'http://example.com/schemas/base#/definitions/hello' }
    }
  }

  ajvInstance.addSchema(baseSchema)
  ajvInstance.addSchema(refSchema)

  const fastify = Fastify({
    schemaController: {
      bucket: function factory (storeInit) {
        t.notOk(storeInit, 'is is always empty because fastify.addSchema is not called')
        return {
          getSchemas () {
            return {
              [baseSchema.$id]: ajvInstance.getSchema(baseSchema.$id).schema,
              [refSchema.$id]: ajvInstance.getSchema(refSchema.$id).schema
            }
          }
        }
      }
    }
  })

  fastify.setValidatorCompiler(function ({ schema }) {
    return ajvInstance.compile(schema)
  })

  fastify.get('/', {
    schema: {
      response: {
        '2xx': ajvInstance.getSchema('http://example.com/schemas/ref').schema
      }
    },
    handler (req, res) { res.send({ hello: 'world', evict: 'this' }) }
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { hello: 'world' })
  })
})

test('setSchemaController in a plugin', t => {
  t.plan(5)
  const baseSchema = {
    $id: 'urn:schema:base',
    definitions: {
      hello: { type: 'string' }
    },
    type: 'object',
    properties: {
      hello: { $ref: '#/definitions/hello' }
    }
  }

  const refSchema = {
    $id: 'urn:schema:ref',
    type: 'object',
    properties: {
      hello: { $ref: 'urn:schema:base#/definitions/hello' }
    }
  }

  const ajvInstance = new AJV()
  ajvInstance.addSchema(baseSchema)
  ajvInstance.addSchema(refSchema)

  const fastify = Fastify()
  fastify.register(schemaPlugin)
  fastify.get('/', {
    schema: {
      query: ajvInstance.getSchema('urn:schema:ref').schema,
      response: {
        '2xx': ajvInstance.getSchema('urn:schema:ref').schema
      }
    },
    handler (req, res) {
      res.send({ hello: 'world', evict: 'this' })
    }
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { hello: 'world' })
  })

  async function schemaPlugin (server) {
    server.setSchemaController({
      bucket () {
        t.pass('the bucket is created')
        return {
          addSchema (source) {
            ajvInstance.addSchema(source)
          },
          getSchema (id) {
            return ajvInstance.getSchema(id).schema
          },
          getSchemas () {
            return {
              'urn:schema:base': baseSchema,
              'urn:schema:ref': refSchema
            }
          }
        }
      }
    })
    server.setValidatorCompiler(function ({ schema }) {
      t.pass('the querystring schema is compiled')
      return ajvInstance.compile(schema)
    })
  }
  schemaPlugin[Symbol.for('skip-override')] = true
})

test('side effect on schema let the server crash', async t => {
  const firstSchema = {
    $id: 'example1',
    type: 'object',
    properties: {
      name: {
        type: 'string'
      }
    }
  }

  const reusedSchema = {
    $id: 'example2',
    type: 'object',
    properties: {
      name: {
        oneOf: [
          {
            $ref: 'example1'
          }
        ]
      }
    }
  }

  const fastify = Fastify()
  fastify.addSchema(firstSchema)

  fastify.post('/a', {
    handler: async () => 'OK',
    schema: {
      body: reusedSchema,
      response: { 200: reusedSchema }
    }
  })
  fastify.post('/b', {
    handler: async () => 'OK',
    schema: {
      body: reusedSchema,
      response: { 200: reusedSchema }
    }
  })

  await fastify.ready()
})
