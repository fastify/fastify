'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const symbols = require('../lib/symbols.js')

test('Should expose addSchema function', t => {
  t.plan(1)
  const fastify = Fastify()
  t.is(typeof fastify.addSchema, 'function')
})

test('Should expose getSchemas function', t => {
  t.plan(1)
  const fastify = Fastify()
  t.is(typeof fastify.getSchemas, 'function')
})

test('The schemas should be added to an internal store', t => {
  t.plan(1)
  const fastify = Fastify()

  const schema = { $id: 'id', my: 'schema' }
  fastify.addSchema(schema)
  t.deepEqual(fastify[symbols.kSchemas].store, { id: schema })
})

test('The schemas should be accessible via getSchemas', t => {
  t.plan(1)
  const fastify = Fastify()

  const schemas = [
    { $id: 'id', my: 'schema' },
    { $id: 'abc', my: 'schema' },
    { $id: 'bcd', my: 'schema', properties: { a: 'a', b: 1 } }
  ]
  const expected = {}
  schemas.forEach(function (schema) {
    expected[schema.$id] = schema
    fastify.addSchema(schema)
  })
  t.deepEqual(fastify.getSchemas(), expected)
})

test('Should throw if the $id property is missing', t => {
  t.plan(2)
  const fastify = Fastify()

  try {
    fastify.addSchema({ type: 'string' })
  } catch (err) {
    t.is(err.code, 'FST_ERR_SCH_MISSING_ID')
    t.is(err.message, 'FST_ERR_SCH_MISSING_ID: Missing schema $id property')
  }
})

test('Cannot add multiple times the same id', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({ $id: 'id' })
  try {
    fastify.addSchema({ $id: 'id' })
  } catch (err) {
    t.is(err.code, 'FST_ERR_SCH_ALREADY_PRESENT')
    t.is(err.message, 'FST_ERR_SCH_ALREADY_PRESENT: Schema with id \'id\' already declared!')
  }
})

test('Should throw of the schema does not exists', t => {
  t.plan(2)
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
    t.is(err.code, 'FST_ERR_SCH_NOT_PRESENT')
    t.is(err.message, 'FST_ERR_SCH_NOT_PRESENT: Schema with id \'test\' does not exist!')
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

test('Encapsulation should intervene', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addSchema({
      $id: 'encapsulation',
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
        params: 'encapsulation#'
      },
      handler: (req, reply) => {
        reply.send(typeof req.params.id)
      }
    })
    next()
  })

  fastify.ready(err => {
    t.is(err.code, 'FST_ERR_SCH_NOT_PRESENT')
    t.is(err.message, 'FST_ERR_SCH_NOT_PRESENT: Schema with id \'encapsulation\' does not exist!')
  })
})

test('Encapsulation isolation', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addSchema({ $id: 'id' })
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.addSchema({ $id: 'id' })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('Encapsulation isolation for getSchemas', t => {
  t.plan(5)
  const fastify = Fastify()

  let pluginDeepOneSide
  let pluginDeepOne
  let pluginDeepTwo

  const schemas = {
    z: { $id: 'z', my: 'schema' },
    a: { $id: 'a', my: 'schema' },
    b: { $id: 'b', my: 'schema' },
    c: { $id: 'c', my: 'schema', properties: { a: 'a', b: 1 } }
  }

  fastify.addSchema(schemas.z)

  fastify.register((instance, opts, next) => {
    instance.addSchema(schemas.a)
    pluginDeepOneSide = instance
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.addSchema(schemas.b)
    instance.register((subinstance, opts, next) => {
      subinstance.addSchema(schemas.c)
      pluginDeepTwo = subinstance
      next()
    })
    pluginDeepOne = instance
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.deepEqual(fastify.getSchemas(), { z: schemas.z })
    t.deepEqual(pluginDeepOneSide.getSchemas(), { z: schemas.z, a: schemas.a })
    t.deepEqual(pluginDeepOne.getSchemas(), { z: schemas.z, b: schemas.b })
    t.deepEqual(pluginDeepTwo.getSchemas(), { z: schemas.z, b: schemas.b, c: schemas.c })
  })
})

test('Encapsulation isolation for $ref to shared schema', t => {
  t.plan(10)
  const fastify = Fastify()

  const commonSchemaAbsoluteUri = {
    $id: 'http://example.com/asset.json',
    type: 'object',
    definitions: {
      id: {
        $id: '#uuid',
        type: 'string',
        format: 'uuid'
      },
      email: {
        $id: '#email',
        type: 'string',
        format: 'email'
      }
    }
  }

  fastify.register((instance, opts, next) => {
    instance.addSchema(commonSchemaAbsoluteUri)
    instance.route({
      method: 'POST',
      url: '/id',
      schema: {
        body: {
          type: 'object',
          properties: { id: { $ref: 'http://example.com/asset.json#uuid' } },
          required: ['id']
        }
      },
      handler: (req, reply) => { reply.send('id is ok') }
    })
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.addSchema(commonSchemaAbsoluteUri)
    instance.route({
      method: 'POST',
      url: '/email',
      schema: {
        body: {
          type: 'object',
          properties: { email: { $ref: 'http://example.com/asset.json#/definitions/email' } },
          required: ['email']
        }
      },
      handler: (req, reply) => { reply.send('email is ok') }
    })
    next()
  })

  const requestId = { id: '550e8400-e29b-41d4-a716-446655440000' }
  const requestEmail = { email: 'foo@bar.it' }

  fastify.inject({
    method: 'POST',
    url: '/id',
    payload: requestId
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })
  fastify.inject({
    method: 'POST',
    url: '/id',
    payload: requestEmail
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'body should have required property \'id\'',
      statusCode: 400
    })
  })

  fastify.inject({
    method: 'POST',
    url: '/email',
    payload: requestEmail
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })
  fastify.inject({
    method: 'POST',
    url: '/email',
    payload: requestId
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      message: 'body should have required property \'email\'',
      statusCode: 400
    })
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

test('Use shared schema and $ref with $id ($ref to $id)', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  const body = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'http://foo/user',
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
    properties: {
      test: 'test#',
      address: { $ref: '#address' }
    }
  }

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body,
      response: {
        200: 'test#'
      }
    },
    handler: (req, reply) => {
      reply.send(req.body.test)
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
    t.deepEqual(JSON.parse(res.payload), { id })
  })
})

test('Use shared schema and $ref with $id in response ($ref to $id)', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  const body = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'http://foo/user',
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
    properties: {
      test: 'test#',
      address: { $ref: '#address' }
    },
    required: ['address', 'test']
  }

  fastify.route({
    method: 'POST',
    url: '/',
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
    t.deepEqual(JSON.parse(res.payload), payload)
  })
})

// https://github.com/fastify/fastify/issues/1043
test('The schema resolver should clean the $id key before passing it to the compiler without modify it', t => {
  t.plan(3)
  const fastify = Fastify()

  const first = {
    $id: 'first',
    type: 'object',
    properties: {
      first: {
        type: 'number'
      }
    }
  }

  fastify.addSchema(first)

  fastify.addSchema({
    $id: 'second',
    type: 'object',
    allOf: [
      {
        type: 'object',
        properties: {
          second: {
            type: 'number'
          }
        }
      },
      'first#'
    ]
  })

  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      description: 'get',
      body: 'second#',
      response: {
        200: 'second#'
      }
    },
    handler: (request, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.route({
    url: '/',
    method: 'PATCH',
    schema: {
      description: 'patch',
      body: 'first#',
      response: {
        200: 'first#'
      }
    },
    handler: (request, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  t.ok(first.$id)
  fastify.ready(err => {
    t.error(err)
    t.ok(first.$id)
  })
})

test('Get schema anyway should not add `properties` if allOf is present', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'first',
    type: 'object',
    properties: {
      first: { type: 'number' }
    }
  })

  fastify.addSchema({
    $id: 'second',
    type: 'object',
    allOf: [
      {
        type: 'object',
        properties: {
          second: { type: 'number' }
        }
      },
      'first#'
    ]
  })

  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: 'second#',
      response: { 200: 'second#' }
    },
    handler: () => {}
  })

  fastify.ready(t.error)
})

test('Get schema anyway should not add `properties` if oneOf is present', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'first',
    type: 'object',
    properties: {
      first: { type: 'number' }
    }
  })

  fastify.addSchema({
    $id: 'second',
    type: 'object',
    oneOf: [
      {
        type: 'object',
        properties: {
          second: { type: 'number' }
        }
      },
      'first#'
    ]
  })

  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: 'second#',
      response: { 200: 'second#' }
    },
    handler: () => {}
  })

  fastify.ready(t.error)
})

test('Get schema anyway should not add `properties` if anyOf is present', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'first',
    type: 'object',
    properties: {
      first: { type: 'number' }
    }
  })

  fastify.addSchema({
    $id: 'second',
    type: 'object',
    anyOf: [
      {
        type: 'object',
        properties: {
          second: { type: 'number' }
        }
      },
      'first#'
    ]
  })

  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: 'second#',
      response: { 200: 'second#' }
    },
    handler: () => {}
  })

  fastify.ready(t.error)
})

test('Shared schema should be pass to serializer and validator ($ref to shared schema /definitions)', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'http://example.com/asset.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Physical Asset',
    description: 'A generic representation of a physical asset',
    type: 'object',
    required: [
      'id',
      'model',
      'location'
    ],
    properties: {
      id: {
        type: 'string',
        format: 'uuid'
      },
      model: {
        type: 'string'
      },
      location: { $ref: 'http://example.com/point.json#' }
    },
    definitions: {
      inner: {
        $id: '#innerId',
        type: 'string',
        format: 'email'
      }
    }
  })

  fastify.addSchema({
    $id: 'http://example.com/point.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Longitude and Latitude Values',
    description: 'A geographical coordinate.',
    type: 'object',
    required: [
      'latitude',
      'longitude'
    ],
    properties: {
      email: { $ref: 'http://example.com/asset.json#/definitions/inner' },
      latitude: {
        type: 'number',
        minimum: -90,
        maximum: 90
      },
      longitude: {
        type: 'number',
        minimum: -180,
        maximum: 180
      },
      altitude: {
        type: 'number'
      }
    }
  })

  const schemaLocations = {
    $id: 'http://example.com/locations.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'List of Asset locations',
    type: 'array',
    items: { $ref: 'http://example.com/asset.json#' },
    default: []
  }

  const locations = [
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } },
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } }
  ]
  fastify.post('/', {
    schema: {
      body: schemaLocations,
      response: { 200: schemaLocations }
    }
  }, (req, reply) => {
    reply.send(locations.map(i => Object.assign({ serializer: 'remove me' }, i)))
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: locations
  }, (err, res) => {
    t.error(err)
    locations.forEach(_ => delete _.remove)
    t.deepEqual(JSON.parse(res.payload), locations)
  })
})

test('Shared schema should be pass to serializer and validator ($ref to shared schema $id)', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'http://example.com/asset.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Physical Asset',
    description: 'A generic representation of a physical asset',
    type: 'object',
    required: [
      'id',
      'model',
      'location'
    ],
    properties: {
      id: {
        type: 'string',
        format: 'uuid'
      },
      model: {
        type: 'string'
      },
      location: { $ref: 'http://example.com/point.json#' }
    },
    definitions: {
      inner: {
        $id: '#innerId',
        type: 'string',
        format: 'email'
      }
    }
  })

  fastify.addSchema({
    $id: 'http://example.com/point.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Longitude and Latitude Values',
    description: 'A geographical coordinate.',
    type: 'object',
    required: [
      'latitude',
      'longitude'
    ],
    properties: {
      email: { $ref: 'http://example.com/asset.json#innerId' },
      latitude: {
        type: 'number',
        minimum: -90,
        maximum: 90
      },
      longitude: {
        type: 'number',
        minimum: -180,
        maximum: 180
      },
      altitude: {
        type: 'number'
      }
    }
  })

  const schemaLocations = {
    $id: 'http://example.com/locations.json',
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'List of Asset locations',
    type: 'array',
    items: { $ref: 'http://example.com/asset.json#' },
    default: []
  }

  const locations = [
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } },
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } }
  ]

  fastify.post('/', {
    schema: {
      body: schemaLocations,
      response: { 200: schemaLocations }
    }
  }, (req, reply) => {
    reply.send(locations.map(i => Object.assign({ serializer: 'remove me' }, i)))
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: locations
  }, (err, res) => {
    t.error(err)
    locations.forEach(_ => delete _.remove)
    t.deepEqual(JSON.parse(res.payload), locations)
  })
})

test('Use shared schema and $ref', t => {
  t.plan(1)
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

  fastify.route({
    method: 'POST',
    url: '/',
    schema: { body },
    handler: (_, r) => { r.send('ok') }
  })

  fastify.ready(t.error)
})

test('Use shared schema and $ref to /definitions', t => {
  t.plan(2)
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
      test: 'test#',
      address: { $ref: '#/definitions/address' }
    },
    required: ['address', 'test']
  }

  fastify.route({
    method: 'POST',
    url: '/',
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
    t.deepEqual(JSON.parse(res.payload), payload)
  })
})

test('Cross shared schema reference', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({ $id: 'item', type: 'object', properties: { foo: { type: 'string' } } })
  fastify.addSchema({
    $id: 'itemList',
    type: 'array',
    items: 'item#'
  })

  fastify.post('/post', { schema: { body: 'itemList#', response: { 200: 'item#' } } }, () => { })
  fastify.get('/get', { schema: { body: 'itemList#', response: { 200: 'item#' } } }, () => { })

  fastify.ready(t.error)
})

test('Cross shared schema reference with unused shared schema', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({ $id: 'item', type: 'object', properties: { foo: { type: 'string' } } })
  fastify.addSchema({
    $id: 'itemList',
    type: 'array',
    items: 'item#'
  })

  fastify.get('/get', { schema: { response: { 200: 'item#' } } }, () => { })
  fastify.ready(t.error)
})

test('Cross shared schema reference with multiple references', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({ $id: 'item', type: 'object', properties: { foo: { type: 'string' } } })

  // This schema is not used
  fastify.addSchema({
    $id: 'itemList',
    type: 'array',
    items: 'item#'
  })

  const multipleRefReplaceWay = {
    type: 'object',
    properties: {
      a: 'item#',
      b: 'item#'
    }
  }

  fastify.get('/get', { schema: { response: { 200: multipleRefReplaceWay } } }, () => { })
  fastify.post('/post', { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { })

  fastify.ready(t.error)
})

test('Cross shared schema reference with encapsulation references', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({ $id: 'item', type: 'object', properties: { foo: { type: 'string' } } })
  fastify.addSchema({
    $id: 'itemList',
    type: 'array',
    items: 'item#'
  })

  fastify.register((instance, opts, next) => {
    // this schema is not used
    instance.addSchema({
      $id: 'encapsulation',
      type: 'object',
      properties: {
        id: { type: 'number' },
        item: 'item#',
        secondItem: 'item#'
      }
    })

    const multipleRefReplaceWay = {
      type: 'object',
      properties: {
        a: 'itemList#',
        b: 'item#',
        c: 'item#',
        d: 'item#'
      }
    }

    instance.post('/post', { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { })
    instance.post('/double', { schema: { response: { 200: 'encapsulation#' } } }, () => { })
    instance.get('/get', { schema: { response: { 200: multipleRefReplaceWay } } }, () => { })
    instance.get('/double-get', { schema: { body: multipleRefReplaceWay, response: { 200: multipleRefReplaceWay } } }, () => { })
    next()
  }, { prefix: '/foo' })

  fastify.post('/post', { schema: { body: 'item#', response: { 200: 'item#' } } }, () => { })
  fastify.get('/get', { schema: { body: 'item#', response: { 200: 'item#' } } }, () => { })

  fastify.ready(t.error)
})

test('shared schema should be ignored in string enum', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/:lang',
    schema: {
      params: {
        type: 'object',
        properties: {
          lang: {
            type: 'string',
            enum: ['Javascript', 'C++', 'C#']
          }
        }
      }
    },
    handler: (req, reply) => {
      reply.send(req.params.lang)
    }
  })

  fastify.inject('/C%23', (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'C#')
  })
})

test('shared schema should NOT be ignored in != string enum', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'C',
    type: 'object',
    properties: {
      lang: {
        type: 'string',
        enum: ['Javascript', 'C++', 'C#']
      }
    }
  })

  fastify.route({
    method: 'POST',
    url: '/:lang',
    schema: {
      body: 'C#'
    },
    handler: (req, reply) => {
      reply.send(req.body.lang)
    }
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    payload: { lang: 'C#' }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, 'C#')
  })
})
