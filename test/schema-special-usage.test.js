'use strict'

const { test } = require('tap')
const Joi = require('joi')
const yup = require('yup')
const AJV = require('ajv')
const S = require('fluent-json-schema')
const Fastify = require('..')
const ajvMergePatch = require('ajv-merge-patch')
const ajvErrors = require('ajv-errors')

test('Ajv plugins array parameter', t => {
  t.plan(3)
  const fastify = Fastify({
    ajv: {
      customOptions: {
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

  const fastify = Fastify({ exposeHeadRoutes: false })
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

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { hello: 'world' })
  })
})

test('JOI validation overwrite request headers', t => {
  t.plan(3)
  const schemaValidator = ({ schema }) => data => {
    const validationResult = schema.validate(data)
    return validationResult
  }

  const fastify = Fastify()
  fastify.setValidatorCompiler(schemaValidator)

  fastify.get('/', {
    schema: {
      headers: Joi.object({
        'user-agent': Joi.string().required(),
        host: Joi.string().required()
      })
    }
  }, (request, reply) => {
    reply.send(request.headers)
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), {
      'user-agent': 'lightMyRequest',
      host: 'localhost:80'
    })
  })
})

test('Custom schema object should not trigger FST_ERR_SCH_DUPLICATE', async t => {
  const fastify = Fastify()
  const handler = () => { }

  fastify.get('/the/url', {
    schema: {
      query: yup.object({
        foo: yup.string()
      })
    },
    validatorCompiler: ({ schema, method, url, httpPart }) => {
      return function (data) {
        // with option strict = false, yup `validateSync` function returns the coerced value if validation was successful, or throws if validation failed
        try {
          const result = schema.validateSync(data, {})
          return { value: result }
        } catch (e) {
          return { error: e }
        }
      }
    },
    handler
  })

  await fastify.ready()
  t.pass('fastify is ready')
})

test('The default schema compilers should not be called when overwritte by the user', async t => {
  const Fastify = t.mock('../', {
    '@fastify/ajv-compiler': () => {
      t.fail('The default validator compiler should not be called')
    },
    '@fastify/fast-json-stringify-compiler': () => {
      t.fail('The default serializer compiler should not be called')
    }
  })

  const fastify = Fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: function factory () {
          t.pass('The custom validator compiler should be called')
          return function validatorCompiler () {
            return () => { return true }
          }
        },
        buildSerializer: function factory () {
          t.pass('The custom serializer compiler should be called')
          return function serializerCompiler () {
            return () => { return true }
          }
        }
      }
    }
  })

  fastify.get('/',
    {
      schema: {
        query: { foo: { type: 'string' } },
        response: {
          200: { type: 'object' }
        }
      }
    }, () => {})

  await fastify.ready()
})

test('Supports async JOI validation', t => {
  t.plan(7)

  const schemaValidator = ({ schema }) => async data => {
    const validationResult = await schema.validateAsync(data)
    return validationResult
  }

  const fastify = Fastify({
    exposeHeadRoutes: false
  })
  fastify.setValidatorCompiler(schemaValidator)

  fastify.get('/', {
    schema: {
      headers: Joi.object({
        'user-agent': Joi.string().external(async (val) => {
          if (val !== 'lightMyRequest') {
            throw new Error('Invalid user-agent')
          }

          t.equal(val, 'lightMyRequest')
          return val
        }),
        host: Joi.string().required()
      })
    }
  }, (request, reply) => {
    reply.send(request.headers)
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), {
      'user-agent': 'lightMyRequest',
      host: 'localhost:80'
    })
  })

  fastify.inject({
    url: '/',
    headers: {
      'user-agent': 'invalid'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      statusCode: 400,
      code: 'FST_ERR_VALIDATION',
      error: 'Bad Request',
      message: 'Invalid user-agent (user-agent)'
    })
  })
})

test('Supports async AJV validation', t => {
  t.plan(12)

  const fastify = Fastify({
    exposeHeadRoutes: false,
    ajv: {
      customOptions: {
        allErrors: true,
        keywords: [
          {
            keyword: 'idExists',
            async: true,
            type: 'number',
            validate: checkIdExists
          }
        ]
      },
      plugins: [
        [ajvErrors, { singleError: '@@@@' }]
      ]
    }
  })

  async function checkIdExists (schema, data) {
    const res = await Promise.resolve(data)
    switch (res) {
      case 42:
        return true

      case 500:
        throw new Error('custom error')

      default:
        return false
    }
  }

  const schema = {
    $async: true,
    type: 'object',
    properties: {
      userId: {
        type: 'integer',
        idExists: { table: 'users' }
      },
      postId: {
        type: 'integer',
        idExists: { table: 'posts' }
      }
    }
  }

  fastify.post('/', {
    schema: {
      body: schema
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { userId: 99 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      statusCode: 400,
      code: 'FST_ERR_VALIDATION',
      error: 'Bad Request',
      message: 'validation failed'
    })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { userId: 500 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      statusCode: 400,
      code: 'FST_ERR_VALIDATION',
      error: 'Bad Request',
      message: 'custom error'
    })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { userId: 42 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { userId: 42 })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { userId: 42, postId: 19 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      statusCode: 400,
      code: 'FST_ERR_VALIDATION',
      error: 'Bad Request',
      message: 'validation failed'
    })
  })
})

test('Check all the async AJV validation paths', t => {
  const fastify = Fastify({
    exposeHeadRoutes: false,
    ajv: {
      customOptions: {
        allErrors: true,
        keywords: [
          {
            keyword: 'idExists',
            async: true,
            type: 'number',
            validate: checkIdExists
          }
        ]
      }
    }
  })

  async function checkIdExists (schema, data) {
    const res = await Promise.resolve(data)
    switch (res) {
      case 200:
        return true

      default:
        return false
    }
  }

  const schema = {
    $async: true,
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        idExists: { table: 'posts' }
      }
    }
  }

  fastify.post('/:id', {
    schema: {
      params: schema,
      body: schema,
      query: schema,
      headers: schema
    },
    handler (req, reply) { reply.send(req.body) }
  })

  const testCases = [
    {
      params: 400,
      body: 200,
      querystring: 200,
      headers: 200,
      response: 400
    },
    {
      params: 200,
      body: 400,
      querystring: 200,
      headers: 200,
      response: 400
    },
    {
      params: 200,
      body: 200,
      querystring: 400,
      headers: 200,
      response: 400
    },
    {
      params: 200,
      body: 200,
      querystring: 200,
      headers: 400,
      response: 400
    },
    {
      params: 200,
      body: 200,
      querystring: 200,
      headers: 200,
      response: 200
    }
  ]
  t.plan(testCases.length * 2)
  testCases.forEach(validate)

  function validate ({
    params,
    body,
    querystring,
    headers,
    response
  }) {
    fastify.inject({
      method: 'POST',
      url: `/${params}`,
      headers: { id: headers },
      query: { id: querystring },
      payload: { id: body }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, response)
    })
  }
})

test('Check mixed sync and async AJV validations', t => {
  const fastify = Fastify({
    exposeHeadRoutes: false,
    ajv: {
      customOptions: {
        allErrors: true,
        keywords: [
          {
            keyword: 'idExists',
            async: true,
            type: 'number',
            validate: checkIdExists
          }
        ]
      }
    }
  })

  async function checkIdExists (schema, data) {
    const res = await Promise.resolve(data)
    switch (res) {
      case 200:
        return true

      default:
        return false
    }
  }

  const schemaSync = {
    type: 'object',
    properties: {
      id: { type: 'integer' }
    }
  }

  const schemaAsync = {
    $async: true,
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        idExists: { table: 'posts' }
      }
    }
  }

  fastify.post('/queryAsync/:id', {
    schema: {
      params: schemaSync,
      body: schemaSync,
      query: schemaAsync,
      headers: schemaSync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.post('/paramsAsync/:id', {
    schema: {
      params: schemaAsync,
      body: schemaSync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.post('/bodyAsync/:id', {
    schema: {
      params: schemaAsync,
      body: schemaAsync,
      query: schemaSync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.post('/headersSync/:id', {
    schema: {
      params: schemaSync,
      body: schemaSync,
      query: schemaAsync,
      headers: schemaSync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.post('/noHeader/:id', {
    schema: {
      params: schemaSync,
      body: schemaSync,
      query: schemaAsync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  fastify.post('/noBody/:id', {
    schema: {
      params: schemaSync,
      query: schemaAsync,
      headers: schemaSync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  const testCases = [
    {
      url: '/queryAsync',
      params: 200,
      body: 200,
      querystring: 200,
      headers: 'not a number sync',
      response: 400
    },
    {
      url: '/paramsAsync',
      params: 200,
      body: 'not a number sync',
      querystring: 200,
      headers: 200,
      response: 400
    },
    {
      url: '/bodyAsync',
      params: 200,
      body: 200,
      querystring: 'not a number sync',
      headers: 200,
      response: 400
    },
    {
      url: '/headersSync',
      params: 200,
      body: 200,
      querystring: 200,
      headers: 'not a number sync',
      response: 400
    },
    {
      url: '/noHeader',
      params: 200,
      body: 200,
      querystring: 200,
      headers: 'not a number sync, but not validated',
      response: 200
    },
    {
      url: '/noBody',
      params: 200,
      body: 'not a number sync, but not validated',
      querystring: 200,
      headers: 'not a number sync',
      response: 400
    }
  ]
  t.plan(testCases.length * 2)
  testCases.forEach(validate)

  function validate ({
    url,
    params,
    body,
    querystring,
    headers,
    response
  }) {
    fastify.inject({
      method: 'POST',
      url: `${url}/${params || ''}`,
      headers: { id: headers },
      query: { id: querystring },
      payload: { id: body }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, response)
    })
  }
})

test('Check if hooks and attachValidation work with AJV validations', t => {
  const fastify = Fastify({
    exposeHeadRoutes: false,
    ajv: {
      customOptions: {
        allErrors: true,
        keywords: [
          {
            keyword: 'idExists',
            async: true,
            type: 'number',
            validate: checkIdExists
          }
        ]
      }
    }
  })

  async function checkIdExists (schema, data) {
    const res = await Promise.resolve(data)
    switch (res) {
      case 200:
        return true

      default:
        return false
    }
  }

  const schemaAsync = {
    $async: true,
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        idExists: { table: 'posts' }
      }
    }
  }

  fastify.post('/:id', {
    preHandler: function hook (request, reply, done) {
      t.equal(request.validationError.message, 'validation failed')
      t.pass('preHandler called')

      reply.code(400).send(request.body)
    },
    attachValidation: true,
    schema: {
      params: schemaAsync,
      body: schemaAsync,
      query: schemaAsync,
      headers: schemaAsync
    },
    handler (req, reply) { reply.send(req.body) }
  })

  const testCases = [
    {
      params: 200,
      body: 200,
      querystring: 200,
      headers: 400,
      response: 400
    },
    {
      params: 200,
      body: 400,
      querystring: 200,
      headers: 200,
      response: 400
    },
    {
      params: 200,
      body: 200,
      querystring: 400,
      headers: 200,
      response: 400
    },
    {
      params: 200,
      body: 200,
      querystring: 200,
      headers: 400,
      response: 400
    }
  ]
  t.plan(testCases.length * 4)
  testCases.forEach(validate)

  function validate ({
    url,
    params,
    body,
    querystring,
    headers,
    response
  }) {
    fastify.inject({
      method: 'POST',
      url: `/${params}`,
      headers: { id: headers },
      query: { id: querystring },
      payload: { id: body }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, response)
    })
  }
})
