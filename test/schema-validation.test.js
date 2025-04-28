'use strict'

const { test } = require('tap')
const Fastify = require('..')
const { request, Agent } = require('undici')

const AJV = require('ajv')
const Schema = require('fluent-json-schema')

const customSchemaCompilers = {
  body: new AJV({
    coerceTypes: false
  }),
  params: new AJV({
    coerceTypes: true
  }),
  querystring: new AJV({
    coerceTypes: true
  })
}

const customValidatorCompiler = req => {
  if (!req.httpPart) {
    throw new Error('Missing httpPart')
  }

  const compiler = customSchemaCompilers[req.httpPart]

  if (!compiler) {
    throw new Error(`Missing compiler for ${req.httpPart}`)
  }

  return compiler.compile(req.schema)
}

const schemaA = {
  $id: 'urn:schema:foo',
  type: 'object',
  definitions: {
    foo: { type: 'integer' }
  },
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
}
const schemaBRefToA = {
  $id: 'urn:schema:response',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
}

const schemaCRefToB = {
  $id: 'urn:schema:request',
  type: 'object',
  required: ['foo'],
  properties: {
    foo: { $ref: 'urn:schema:response#/properties/foo' }
  }
}

const schemaArtist = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    work: { type: 'string' }
  },
  required: ['name', 'work']
}

test('Basic validation test', t => {
  t.plan(6)

  const fastify = Fastify()
  fastify.post('/', {
    schema: {
      body: schemaArtist
    }
  }, function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    payload: {
      name: 'michelangelo',
      work: 'sculptor, painter, architect and poet'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'michelangelo')
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'POST',
    payload: { name: 'michelangelo' },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), { statusCode: 400, code: 'FST_ERR_VALIDATION', error: 'Bad Request', message: "body must have required property 'work'" })
    t.equal(res.statusCode, 400)
  })
})

test('Different schema per content type', t => {
  t.plan(12)

  const fastify = Fastify()
  fastify.addContentTypeParser('application/octet-stream', {
    parseAs: 'buffer'
  }, async function (_, payload) {
    return payload
  })
  fastify.post('/', {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: schemaArtist
          },
          'application/octet-stream': {
            schema: {} // Skip validation
          },
          'text/plain': {
            schema: { type: 'string' }
          }
        }
      }
    }
  }, async function (req, reply) {
    return reply.send(req.body)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      name: 'michelangelo',
      work: 'sculptor, painter, architect and poet'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload).name, 'michelangelo')
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'michelangelo' }
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), { statusCode: 400, code: 'FST_ERR_VALIDATION', error: 'Bad Request', message: "body must have required property 'work'" })
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.from('AAAAAAAA')
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'AAAAAAAA')
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'AAAAAAAA'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'AAAAAAAA')
    t.equal(res.statusCode, 200)
  })
})

test('Skip validation if no schema for content type', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.post('/', {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: schemaArtist
          }
          // No schema for 'text/plain'
        }
      }
    }
  }, async function (req, reply) {
    return reply.send(req.body)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'AAAAAAAA'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'AAAAAAAA')
    t.equal(res.statusCode, 200)
  })
})

test('Skip validation if no content type schemas', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.post('/', {
    schema: {
      body: {
        content: {
          // No schemas
        }
      }
    }
  }, async function (req, reply) {
    return reply.send(req.body)
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'AAAAAAAA'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'AAAAAAAA')
    t.equal(res.statusCode, 200)
  })
})

test('External AJV instance', t => {
  t.plan(5)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(schemaA)
  ajv.addSchema(schemaBRefToA)

  // the user must provide the schemas to fastify also
  fastify.addSchema(schemaA)
  fastify.addSchema(schemaBRefToA)

  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    t.pass('custom validator compiler called')
    return ajv.compile(schema)
  })

  fastify.post('/', {
    handler (req, reply) { reply.send({ foo: 1 }) },
    schema: {
      body: schemaCRefToB,
      response: {
        '2xx': ajv.getSchema('urn:schema:response').schema
      }
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 42 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 'not a number' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })
})

test('Encapsulation', t => {
  t.plan(21)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(schemaA)
  ajv.addSchema(schemaBRefToA)

  // the user must provide the schemas to fastify also
  fastify.addSchema(schemaA)
  fastify.addSchema(schemaBRefToA)

  fastify.register((instance, opts, done) => {
    const validator = ({ schema, method, url, httpPart }) => {
      t.pass('custom validator compiler called')
      return ajv.compile(schema)
    }
    instance.setValidatorCompiler(validator)
    instance.post('/one', {
      handler (req, reply) { reply.send({ foo: 'one' }) },
      schema: {
        body: ajv.getSchema('urn:schema:response').schema
      }
    })

    instance.register((instance, opts, done) => {
      instance.post('/two', {
        handler (req, reply) {
          t.same(instance.validatorCompiler, validator)
          reply.send({ foo: 'two' })
        },
        schema: {
          body: ajv.getSchema('urn:schema:response').schema
        }
      })

      const anotherValidator = ({ schema, method, url, httpPart }) => {
        return () => { return true } // always valid
      }
      instance.post('/three', {
        validatorCompiler: anotherValidator,
        handler (req, reply) {
          t.same(instance.validatorCompiler, validator, 'the route validator does not change the instance one')
          reply.send({ foo: 'three' })
        },
        schema: {
          body: ajv.getSchema('urn:schema:response').schema
        }
      })
      done()
    })
    done()
  })

  fastify.register((instance, opts, done) => {
    instance.post('/clean', function (req, reply) {
      t.equal(instance.validatorCompiler, undefined)
      reply.send({ foo: 'bar' })
    })
    done()
  })

  fastify.inject({
    method: 'POST',
    url: '/one',
    payload: { foo: 1 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { foo: 'one' })
  })

  fastify.inject({
    method: 'POST',
    url: '/one',
    payload: { wrongFoo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    url: '/two',
    payload: { foo: 2 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { foo: 'two' })
  })

  fastify.inject({
    method: 'POST',
    url: '/two',
    payload: { wrongFoo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    url: '/three',
    payload: { wrongFoo: 'but works' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { foo: 'three' })
  })

  fastify.inject({
    method: 'POST',
    url: '/clean',
    payload: { wrongFoo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { foo: 'bar' })
  })
})

test('Triple $ref with a simple $id', t => {
  t.plan(7)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(schemaA)
  ajv.addSchema(schemaBRefToA)
  ajv.addSchema(schemaCRefToB)

  // the user must provide the schemas to fastify also
  fastify.addSchema(schemaA)
  fastify.addSchema(schemaBRefToA)
  fastify.addSchema(schemaCRefToB)

  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    t.pass('custom validator compiler called')
    return ajv.compile(schema)
  })

  fastify.post('/', {
    handler (req, reply) { reply.send({ foo: 105, bar: 'foo' }) },
    schema: {
      body: ajv.getSchema('urn:schema:request').schema,
      response: {
        '2xx': ajv.getSchema('urn:schema:response').schema
      }
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 43 }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { foo: 105 })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { fool: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json().message, "body must have required property 'foo'")
  })
})

test('Extending schema', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'address.id',
    type: 'object',
    definitions: {
      address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          state: { type: 'string' }
        },
        required: ['city', 'state']
      }
    }
  })

  fastify.post('/', {
    handler (req, reply) { reply.send('works') },
    schema: {
      body: {
        type: 'object',
        properties: {
          billingAddress: { $ref: 'address.id#/definitions/address' },
          shippingAddress: {
            allOf: [
              { $ref: 'address.id#/definitions/address' },
              {
                type: 'object',
                properties: { type: { enum: ['residential', 'business'] } },
                required: ['type']
              }
            ]
          }
        }
      }
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      shippingAddress: {
        city: 'Forlì',
        state: 'FC'
      }
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      shippingAddress: {
        city: 'Forlì',
        state: 'FC',
        type: 'business'
      }
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
  })
})

test('Should work with nested ids', t => {
  t.plan(6)
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

  fastify.post('/:id', {
    handler (req, reply) { reply.send(typeof req.params.id) },
    schema: {
      params: { $ref: 'test#' },
      body: {
        type: 'object',
        properties: {
          hello: { $ref: 'greetings#' }
        }
      }
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
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'number')
  })

  fastify.inject({
    method: 'POST',
    url: '/abc',
    payload: {
      hello: 'world'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.equal(res.json().message, 'params/id must be number')
  })
})

test('Use the same schema across multiple routes', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.get('/first/:id', {
    handler (req, reply) { reply.send(typeof req.params.id) },
    schema: {
      params: { $ref: 'test#' }
    }
  })

  fastify.get('/second/:id', {
    handler (req, reply) { reply.send(typeof req.params.id) },
    schema: {
      params: { $ref: 'test#' }
    }
  })

  ;[
    '/first/123',
    '/second/123'
  ].forEach(url => {
    fastify.inject({
      url,
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.equal(res.payload, 'number')
    })
  })

  ;[
    '/first/abc',
    '/second/abc'
  ].forEach(url => {
    fastify.inject({
      url,
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 400)
    })
  })
})

test('JSON Schema validation keywords', t => {
  t.plan(6)
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

  fastify.get('/:ip', {
    handler (req, reply) { reply.send(typeof req.params.ip) },
    schema: {
      params: { $ref: 'test#' }
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/127.0.0.1'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'string')
  })

  fastify.inject({
    method: 'GET',
    url: '/localhost'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      statusCode: 400,
      code: 'FST_ERR_VALIDATION',
      error: 'Bad Request',
      message: 'params/ip must match format "ipv4"'
    })
  })
})

test('Nested id calls', t => {
  t.plan(6)
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
      host: { $ref: 'test#' }
    }
  })

  fastify.post('/', {
    handler (req, reply) { reply.send(typeof req.body.host.ip) },
    schema: {
      body: { $ref: 'hello#' }
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { host: { ip: '127.0.0.1' } }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'string')
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { host: { ip: 'localhost' } }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      error: 'Bad Request',
      message: 'body/host/ip must match format "ipv4"',
      statusCode: 400,
      code: 'FST_ERR_VALIDATION'
    })
  })
})

test('Use the same schema id in different places', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.post('/', {
    handler (req, reply) { reply.send({ id: req.body.id / 2 }) },
    schema: {
      body: { $ref: 'test#' },
      response: {
        200: { $ref: 'test#' }
      }
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { id: 42 }
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), { id: 21 })
  })
})

test('Use shared schema and $ref with $id ($ref to $id)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'http://foo/test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  const body = {
    $id: 'http://foo/user',
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    definitions: {
      address: {
        $id: '#address',
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    },
    required: ['address'],
    properties: {
      test: { $ref: 'http://foo/test#' }, // to external
      address: { $ref: '#address' } // to local
    }
  }

  fastify.post('/', {
    handler (req, reply) { reply.send(req.body.test) },
    schema: {
      body,
      response: {
        200: { $ref: 'http://foo/test#' }
      }
    }
  })

  const id = Date.now()
  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      address: { city: 'New Node' },
      test: { id }
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), { id })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { test: { id } }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      error: 'Bad Request',
      message: "body must have required property 'address'",
      statusCode: 400,
      code: 'FST_ERR_VALIDATION'
    })
  })
})

test('Use items with $ref', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'http://example.com/ref-to-external-validator.json',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  const body = {
    type: 'array',
    items: { $ref: 'http://example.com/ref-to-external-validator.json#' }
  }

  fastify.post('/', {
    schema: { body },
    handler: (_, r) => { r.send('ok') }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: [{ hello: 'world' }]
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, 'ok')
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })
})

test('Use $ref to /definitions', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  const body = {
    type: 'object',
    definitions: {
      address: {
        $id: '#otherId',
        type: 'object',
        properties: {
          city: { type: 'string' }
        }
      }
    },
    properties: {
      test: { $ref: 'test#' },
      address: { $ref: '#/definitions/address' }
    },
    required: ['address', 'test']
  }

  fastify.post('/', {
    schema: {
      body,
      response: {
        200: body
      }
    },
    handler: (req, reply) => {
      req.body.removeThis = 'it should not be serialized'
      reply.send(req.body)
    }
  })

  const payload = {
    address: { city: 'New Node' },
    test: { id: Date.now() }
  }
  fastify.inject({
    method: 'POST',
    url: '/',
    payload
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), payload)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      address: { city: 'New Node' },
      test: { id: 'wrong' }
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
    t.same(res.json(), {
      error: 'Bad Request',
      message: 'body/test/id must be number',
      statusCode: 400,
      code: 'FST_ERR_VALIDATION'
    })
  })
})

test('Custom AJV settings - pt1', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: { num: { type: 'integer' } }
    },
    handler: (req, reply) => {
      t.equal(req.body.num, 12)
      reply.send(req.body)
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      num: '12'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(res.json(), { num: 12 })
  })
})

test('Custom AJV settings - pt2', t => {
  t.plan(2)
  const fastify = Fastify({
    ajv: {
      customOptions: {
        coerceTypes: false
      }
    }
  })

  fastify.post('/', {
    schema: {
      body: { num: { type: 'integer' } }
    },
    handler: (req, reply) => {
      t.fail('the handler is not called because the "12" is not coerced to number')
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: {
      num: '12'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })
})

test('Custom AJV settings on different parameters - pt1', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.setValidatorCompiler(customValidatorCompiler)

  fastify.post('/api/:id', {
    schema: {
      querystring: { id: { type: 'integer' } },
      body: {
        type: 'object',
        properties: {
          num: { type: 'number' }
        },
        required: ['num']
      }
    },
    handler: (req, reply) => {
      t.fail('the handler is not called because the "12" is not coerced to number')
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/api/42',
    payload: {
      num: '12'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 400)
  })
})

test('Custom AJV settings on different parameters - pt2', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.setValidatorCompiler(customValidatorCompiler)

  fastify.post('/api/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          num: { type: 'number' }
        },
        required: ['num']
      }
    },
    handler: (req, reply) => {
      t.same(typeof req.params.id, 'number')
      t.same(typeof req.body.num, 'number')
      t.same(req.params.id, 42)
      t.same(req.body.num, 12)
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/api/42',
    payload: {
      num: 12
    }
  })
})

test("The same $id in route's schema must not overwrite others", t => {
  t.plan(4)
  const fastify = Fastify()

  const UserSchema = Schema.object()
    .id('http://mydomain.com/user')
    .title('User schema')
    .description('Contains all user fields')
    .prop('id', Schema.integer())
    .prop('username', Schema.string().minLength(4))
    .prop('firstName', Schema.string().minLength(1))
    .prop('lastName', Schema.string().minLength(1))
    .prop('fullName', Schema.string().minLength(1))
    .prop('email', Schema.string())
    .prop('password', Schema.string().minLength(6))
    .prop('bio', Schema.string())

  const userCreateSchema = UserSchema.only([
    'username',
    'firstName',
    'lastName',
    'email',
    'bio',
    'password',
    'password_confirm'
  ])
    .required([
      'username',
      'firstName',
      'lastName',
      'email',
      'bio',
      'password'
    ])

  const userPatchSchema = UserSchema.only([
    'firstName',
    'lastName',
    'bio'
  ])

  fastify
    .patch('/user/:id', {
      schema: { body: userPatchSchema },
      handler: () => { return 'ok' }
    })
    .post('/user', {
      schema: { body: userCreateSchema },
      handler: () => { return 'ok' }
    })

  fastify.inject({
    method: 'POST',
    url: '/user',
    body: {}
  }, (err, res) => {
    t.error(err)
    t.same(res.json().message, "body must have required property 'username'")
  })

  fastify.inject({
    url: '/user/1',
    method: 'PATCH',
    body: {}
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'ok')
  })
})

test('Custom validator compiler should not mutate schema', async t => {
  t.plan(2)
  class Headers { }
  const fastify = Fastify()

  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
    t.type(schema, Headers)
    return () => { }
  })

  fastify.get('/', {
    schema: {
      headers: new Headers()
    }
  }, () => { })

  await fastify.ready()
})

test('Custom validator builder override by custom validator compiler', async t => {
  t.plan(3)
  const ajvDefaults = {
    removeAdditional: true,
    coerceTypes: true,
    allErrors: true
  }
  const ajv1 = new AJV(ajvDefaults).addKeyword({ keyword: 'extended_one', type: 'object', validator: () => true })
  const ajv2 = new AJV(ajvDefaults).addKeyword({ keyword: 'extended_two', type: 'object', validator: () => true })
  const fastify = Fastify({ schemaController: { compilersFactory: { buildValidator: () => (routeSchemaDef) => ajv1.compile(routeSchemaDef.schema) } } })

  fastify.setValidatorCompiler((routeSchemaDef) => ajv2.compile(routeSchemaDef.schema))

  fastify.post('/two/:id', {
    schema: {
      params: {
        type: 'object',
        extended_two: true,
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    },
    handler: (req, _reply) => {
      t.same(typeof req.params.id, 'number')
      t.same(req.params.id, 43)
      return 'ok'
    }
  })

  await fastify.ready()

  const two = await fastify.inject({
    method: 'POST',
    url: '/two/43'
  })
  t.equal(two.statusCode, 200)
})

test('Custom validator builder override by custom validator compiler in child instance', async t => {
  t.plan(6)
  const ajvDefaults = {
    removeAdditional: true,
    coerceTypes: true,
    allErrors: true
  }
  const ajv1 = new AJV(ajvDefaults).addKeyword({ keyword: 'extended_one', type: 'object', validator: () => true })
  const ajv2 = new AJV(ajvDefaults).addKeyword({ keyword: 'extended_two', type: 'object', validator: () => true })
  const fastify = Fastify({ schemaController: { compilersFactory: { buildValidator: () => (routeSchemaDef) => ajv1.compile(routeSchemaDef.schema) } } })

  fastify.register((embedded, _opts, done) => {
    embedded.setValidatorCompiler((routeSchemaDef) => ajv2.compile(routeSchemaDef.schema))
    embedded.post('/two/:id', {
      schema: {
        params: {
          type: 'object',
          extended_two: true,
          properties: {
            id: { type: 'number' }
          },
          required: ['id']
        }
      },
      handler: (req, _reply) => {
        t.same(typeof req.params.id, 'number')
        t.same(req.params.id, 43)
        return 'ok'
      }
    })
    done()
  })

  fastify.post('/one/:id', {
    schema: {
      params: {
        type: 'object',
        extended_one: true,
        properties: {
          id: { type: 'number' }
        },
        required: ['id']
      }
    },
    handler: (req, _reply) => {
      t.same(typeof req.params.id, 'number')
      t.same(req.params.id, 42)
      return 'ok'
    }
  })

  await fastify.ready()

  const one = await fastify.inject({
    method: 'POST',
    url: '/one/42'
  })
  t.equal(one.statusCode, 200)

  const two = await fastify.inject({
    method: 'POST',
    url: '/two/43'
  })
  t.equal(two.statusCode, 200)
})

test('Schema validation when no content type is provided', async t => {
  // this case should not be happened in normal use-case,
  // it is added for the completeness of code branch
  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                foo: { type: 'string' }
              },
              required: ['foo'],
              additionalProperties: false
            }
          }
        }
      }
    },
    preValidation: async (request) => {
      request.headers['content-type'] = undefined
    }
  }, async () => 'ok')

  await fastify.ready()

  const invalid = await fastify.inject({
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json'
    },
    body: { invalid: 'string' }
  })
  t.equal(invalid.statusCode, 200)
})

test('Schema validation will not be bypass by different content type', async t => {
  t.plan(10)

  const fastify = Fastify()

  fastify.post('/', {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                foo: { type: 'string' }
              },
              required: ['foo'],
              additionalProperties: false
            }
          }
        }
      }
    }
  }, async () => 'ok')

  await fastify.listen({ port: 0 })
  t.teardown(() => fastify.close())
  const address = fastify.listeningOrigin

  const correct1 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ foo: 'string' })
  })
  t.equal(correct1.statusCode, 200)
  await correct1.body.dump()

  const correct2 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ foo: 'string' })
  })
  t.equal(correct2.statusCode, 200)
  await correct2.body.dump()

  const invalid1 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'application/json ;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.equal(invalid1.statusCode, 415)
  t.equal((await invalid1.body.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  const invalid2 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.equal(invalid2.statusCode, 415)
  t.equal((await invalid2.body.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  const invalid3 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn ;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.equal(invalid3.statusCode, 415)
  t.equal((await invalid3.body.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')

  const invalid4 = await request(address, {
    dispatcher: new Agent({ pipelining: 0 }),
    method: 'POST',
    url: '/',
    headers: {
      'content-type': 'ApPlIcAtIoN/JsOn foo;'
    },
    body: JSON.stringify({ invalid: 'string' })
  })
  t.equal(invalid4.statusCode, 415)
  t.equal((await invalid4.body.json()).code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
})
