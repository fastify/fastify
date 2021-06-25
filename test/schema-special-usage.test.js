'use strict'

const { test } = require('tap')
const AJV = require('ajv')
const S = require('fluent-json-schema')
const Fastify = require('..')
const ajvMergePatch = require('ajv-merge-patch')
const ajvErrors = require('ajv-errors')

// JSON Type Definition schema formats AJV Instance, Requires AJV 7+
const AjvJTD = require('@fastify/ajv-compiler-8/node_modules/ajv/dist/jtd')

const buildValidatorAJV8 = require('@fastify/ajv-compiler-8')

test('Ajv8 usage instead of the bundle one', t => {
  t.plan(1)

  t.test('use new ajv8 option', t => {
    t.plan(2)
    const fastify = Fastify({
      ajv: {
        customOptions: { strictRequired: true }
      },
      schemaController: {
        compilersFactory: {
          buildValidator: buildValidatorAJV8()
        }
      }
    })

    fastify.post('/', {
      schema: {
        body: {
          type: 'object',
          required: ['missing'],
          properties: {
            foo: {
              type: 'string'
            }
          }
        }
      },
      handler (req, reply) { reply.send({ ok: 1 }) }
    })

    fastify.ready(err => {
      t.ok(err)
      t.match(err.message, 'strictRequired', 'the new ajv8 option trigger a startup error')
    })
  })
})

test('JTD Usage via manual inclusion', t => {
  t.plan(2)

  t.test('use JTD explicit substitution to fail on JSON Schema', t => {
    t.plan(2)
    const ajv = new AjvJTD({
      allErrors: true
    })
    const fastify = Fastify({ jsonShorthand: false })
    fastify.setValidatorCompiler(({ schema }) => {
      return ajv.compile(schema)
    })

    fastify.post('/', {
      schema: {
        body: {
          // JSON Schema style discriminator is invalid in JTD schemas
          discriminator: { propertyName: 'version' },
          oneOf: [
            {
              properties: {
                version: { const: '1' },
                foo: { type: 'string' }
              },
              required: ['version']
            },
            {
              properties: {
                version: { const: '2' },
                foo: { type: 'number' }
              },
              required: ['version']
            }
          ]
        }
      },
      handler (req, reply) { reply.send({ ok: 1 }) }
    })

    fastify
      .ready(err => {
        t.ok(err)
        t.match(
          err?.message,
          `Failed building the validation schema for POST: /,
           due to error schema is invalid: data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'ref',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'type',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'enum',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'elements',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'properties',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must have property 'optionalProperties',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data/discriminator must be string,
           data must have property 'mapping',
           data/oneOf must NOT have additional properties,
           data must have property 'values',
           data/discriminator must NOT have additional properties,
           data/oneOf must NOT have additional properties,
           data must match a schema in union
          `.replace(/\n|( {2})+/g, ''),
          'the JTD schema won\'t compile when using strict mode JSON Schema'
        )
      })
  })

  t.test('use JTD explicit substitution for basic JTD support', t => {
    t.plan(1)
    const ajv = new AjvJTD({
      allErrors: true
    })
    const fastify = Fastify({ jsonShorthand: false })
    fastify.setValidatorCompiler(({ schema }) => {
      return ajv.compile(schema)
    })

    fastify.post('/', {
      schema: {
        body: {
          discriminator: 'version',
          mapping: {
            1: {
              properties: {
                foo: { type: 'uint8' }
              }
            },
            2: {
              properties: {
                foo: { type: 'string' }
              }
            }
          }
        }
      },
      handler (req, reply) { reply.send({ ok: 1 }) }
    })

    fastify
      .ready(err => {
        t.equal(err, undefined)
      })
  })
})

test('Ajv8 usage with plugins', { skip: 'until npm 7.2 will be bundled with node.js 16 https://github.com/npm/cli/issues/3147' }, t => {
  t.plan(2)

  t.test('use new ajv8 option', t => {
    t.plan(3)
    const fastify = Fastify({
      ajv: {
        customOptions: { validateFormats: true },
        plugins: [require('ajv-formats')]
      },
      schemaController: {
        compilersFactory: {
          buildValidator: buildValidatorAJV8()
        }
      }
    })

    callIt(fastify, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 400)
      t.equal(res.json().message, 'body must match format "date"')
    })
  })

  t.test('use new ajv8 option - avoid check', t => {
    t.plan(2)
    const fastify = Fastify({
      ajv: {
        customOptions: { validateFormats: false }
      },
      schemaController: {
        compilersFactory: {
          buildValidator: buildValidatorAJV8()
        }
      }
    })

    callIt(fastify, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 200)
    })
  })

  function callIt (fastify, cb) {
    fastify.post('/', {
      schema: {
        body: {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              format: 'date'
            }
          }
        }
      },
      handler (req, reply) { reply.send({ ok: 1 }) }
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { foo: '99' }
    }, cb)
  }
})

test('Ajv plugins array parameter', t => {
  t.plan(3)
  const fastify = Fastify({
    ajv: {
      customOptions: {
        jsonPointers: true,
        allErrors: true
      },
      plugins: [
        [ajvErrors, { singleError: '@@@@' }]
      ]
    }
  })

  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          foo: {
            type: 'number',
            minimum: 2,
            maximum: 10,
            multipleOf: 2,
            errorMessage: {
              type: 'should be number',
              minimum: 'should be >= 2',
              maximum: 'should be <= 10',
              multipleOf: 'should be multipleOf 2'
            }
          }
        }
      }
    },
    handler (req, reply) { reply.send({ ok: 1 }) }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 99 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.json().message, 'body/foo should be <= 10@@@@should be multipleOf 2')
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
      t.equal(res.statusCode, 400)
    })

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: { q: 'foo' }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 200)
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
      t.equal(res.statusCode, 400)
    })

    fastify.inject({
      method: 'GET',
      url: '/',
      headers: { q: 10 }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 200)
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
      t.equal(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { q: 'foo' }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 200)
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
      t.equal(res.statusCode, 400)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { q: 10 }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 200)
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
        t.notOk(storeInit, 'is always empty because fastify.addSchema is not called')
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
    t.equal(res.statusCode, 200)
    t.same(res.json(), { hello: 'world' })
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
    t.equal(res.statusCode, 200)
    t.same(res.json(), { hello: 'world' })
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

test('only response schema trigger AJV pollution', async t => {
  const ShowSchema = S.object().id('ShowSchema').prop('name', S.string())
  const ListSchema = S.array().id('ListSchema').items(S.ref('ShowSchema#'))

  const fastify = Fastify()
  fastify.addSchema(ListSchema)
  fastify.addSchema(ShowSchema)

  const routeResponseSchemas = {
    schema: { response: { 200: S.ref('ListSchema#') } }
  }

  fastify.register(
    async (app) => { app.get('/resource/', routeResponseSchemas, () => ({})) },
    { prefix: '/prefix1' }
  )
  fastify.register(
    async (app) => { app.get('/resource/', routeResponseSchemas, () => ({})) },
    { prefix: '/prefix2' }
  )

  await fastify.ready()
})

test('only response schema trigger AJV pollution #2', async t => {
  const ShowSchema = S.object().id('ShowSchema').prop('name', S.string())
  const ListSchema = S.array().id('ListSchema').items(S.ref('ShowSchema#'))

  const fastify = Fastify()
  fastify.addSchema(ListSchema)
  fastify.addSchema(ShowSchema)

  const routeResponseSchemas = {
    schema: {
      params: S.ref('ListSchema#'),
      response: { 200: S.ref('ListSchema#') }
    }
  }

  fastify.register(
    async (app) => { app.get('/resource/', routeResponseSchemas, () => ({})) },
    { prefix: '/prefix1' }
  )
  fastify.register(
    async (app) => { app.get('/resource/', routeResponseSchemas, () => ({})) },
    { prefix: '/prefix2' }
  )

  await fastify.ready()
})

test('setSchemaController in a plugin with head routes', t => {
  t.plan(6)
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

  const fastify = Fastify({ exposeHeadRoutes: true })
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
    t.equal(res.statusCode, 200)
    t.same(res.json(), { hello: 'world' })
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
      if (schema.$id) {
        const stored = ajvInstance.getSchema(schema.$id)
        if (stored) {
          t.pass('the schema is reused')
          return stored
        }
      }
      t.pass('the schema is compiled')

      return ajvInstance.compile(schema)
    })
  }
  schemaPlugin[Symbol.for('skip-override')] = true
})

test('multiple refs with the same ids', t => {
  t.plan(3)
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

  const fastify = Fastify()

  fastify.addSchema(baseSchema)
  fastify.addSchema(refSchema)
  fastify.get('/', {
    schema: {
      query: refSchema,
      response: {
        '2xx': refSchema
      }
    },
    handler (req, res) {
      res.send({ hello: 'world', evict: 'this' })
    }
  })

  fastify.head('/', {
    schema: {
      query: refSchema,
      response: {
        '2xx': refSchema
      }
    },
    handler (req, res) {
      res.send({ hello: 'world', evict: 'this' })
    }
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { hello: 'world' })
  })
})
