'use strict'

const { test } = require('tap')
const Fastify = require('..')

const AJV = require('ajv')

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
    t.same(res.json(), { statusCode: 400, error: 'Bad Request', message: "body should have required property 'work'" })
    t.equal(res.statusCode, 400)
  })
})

test('External AJV instance', t => {
  t.plan(4)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(schemaA)
  ajv.addSchema(schemaBRefToA)

  // the user must provide the schemas to fastify also
  fastify.addSchema(schemaA)
  fastify.addSchema(schemaBRefToA)

  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => {
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
  t.plan(19)

  const fastify = Fastify()
  const ajv = new AJV()
  ajv.addSchema(schemaA)
  ajv.addSchema(schemaBRefToA)

  // the user must provide the schemas to fastify also
  fastify.addSchema(schemaA)
  fastify.addSchema(schemaBRefToA)

  fastify.register((instance, opts, done) => {
    const validator = ({ schema, method, url, httpPart }) => {
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
  t.plan(6)

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
    t.same(res.json().message, "body should have required property 'foo'")
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
    t.equal(res.json().message, 'params.id should be number')
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
      error: 'Bad Request',
      message: 'params.ip should match format "ipv4"'
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
      message: 'body.host.ip should match format "ipv4"',
      statusCode: 400
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
      message: "body should have required property 'address'",
      statusCode: 400
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
    items: { $ref: 'http://example.com/ref-to-external-validator.json#' },
    default: []
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
      message: 'body.test.id should be number',
      statusCode: 400
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
