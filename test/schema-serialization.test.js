'use strict'

const t = require('tap')
const Fastify = require('..')
const test = t.test

const echoBody = (req, reply) => { reply.send(req.body) }

test('basic test', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            name: { type: 'string' },
            work: { type: 'string' }
          }
        }
      }
    }
  }, function (req, reply) {
    reply.code(200).send({ name: 'Foo', work: 'Bar', nick: 'Boo' })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.same(res.json(), { name: 'Foo', work: 'Bar' })
    t.equal(res.statusCode, 200)
  })
})

test('custom serializer options', t => {
  t.plan(3)

  const fastify = Fastify({
    serializerOpts: {
      rounding: 'ceil'
    }
  })
  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'integer'
        }
      }
    }
  }, function (req, reply) {
    reply.send(4.2)
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.payload, '5', 'it must use the ceil rouding')
    t.equal(res.statusCode, 200)
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

  fastify.get('/:id', {
    handler (req, reply) {
      reply.send([{ id: 1 }, { id: 2 }, { what: 'is this' }])
    },
    schema: {
      response: {
        200: {
          type: 'array',
          items: { $ref: 'test' }
        }
      }
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/123'
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), [{ id: 1 }, { id: 2 }, { }])
  })
})

test('Use shared schema and $ref with $id in response ($ref to $id)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'http://foo/test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  const complexSchema = {
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
      test: { $ref: 'http://foo/test#' },
      address: { $ref: '#address' }
    },
    required: ['address', 'test']
  }

  fastify.post('/', {
    schema: {
      body: complexSchema,
      response: {
        200: complexSchema
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
    t.same(res.json(), payload)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { test: { id: Date.now() } }
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

test('Shared schema should be pass to serializer and validator ($ref to shared schema /definitions)', t => {
  t.plan(5)
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

  fastify.post('/', {
    schema: {
      body: schemaLocations,
      response: { 200: schemaLocations }
    }
  }, (req, reply) => {
    reply.send(locations.map(_ => Object.assign({ serializer: 'remove me' }, _)))
  })

  const locations = [
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } },
    { id: '550e8400-e29b-41d4-a716-446655440000', model: 'mod', location: { latitude: 10, longitude: 10, email: 'foo@bar.it' } }
  ]
  fastify.inject({
    method: 'POST',
    url: '/',
    payload: locations
  }, (err, res) => {
    t.error(err)
    t.same(res.json(), locations)

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: locations.map(_ => {
        _.location.email = 'not an email'
        return _
      })
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 400)
      t.same(res.json(), {
        error: 'Bad Request',
        message: 'body[0].location.email should match format "email"',
        statusCode: 400
      })
    })
  })
})

test('Custom setSerializerCompiler', t => {
  t.plan(7)
  const fastify = Fastify()

  const outSchema = {
    $id: 'test',
    type: 'object',
    whatever: 'need to be parsed by the custom serializer'
  }

  fastify.setSerializerCompiler(({ schema, method, url, httpStatus }) => {
    t.equal(method, 'GET')
    t.equal(url, '/foo/:id')
    t.equal(httpStatus, '200')
    t.same(schema, outSchema)
    return data => JSON.stringify(data)
  })

  fastify.register((instance, opts, done) => {
    instance.get('/:id', {
      handler (req, reply) {
        reply.send({ id: 1 })
      },
      schema: {
        response: {
          200: outSchema
        }
      }
    })
    t.ok(instance.serializerCompiler, 'the serializer is set by the parent')
    done()
  }, { prefix: '/foo' })

  fastify.inject({
    method: 'GET',
    url: '/foo/123'
  }, (err, res) => {
    t.error(err)
    t.equal(res.payload, JSON.stringify({ id: 1 }))
  })
})

test('Custom setSerializerCompiler returns bad serialized output', t => {
  t.plan(4)
  const fastify = Fastify()

  const outSchema = {
    $id: 'test',
    type: 'object',
    whatever: 'need to be parsed by the custom serializer'
  }

  fastify.setSerializerCompiler(({ schema, method, url, httpStatus }) => {
    return data => {
      t.pass('returning an invalid serialization')
      return { not: 'a string' }
    }
  })

  fastify.get('/:id', {
    handler (req, reply) { throw new Error('ops') },
    schema: {
      response: {
        500: outSchema
      }
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/123'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
    t.strictSame(res.json(), {
      error: 'Internal Server Error',
      code: 'FST_ERR_REP_INVALID_PAYLOAD_TYPE',
      message: 'Attempted to send payload of invalid type \'object\'. Expected a string or Buffer.',
      statusCode: 500
    })
  })
})

test('Custom serializer per route', async t => {
  const fastify = Fastify()

  const outSchema = {
    $id: 'test',
    type: 'object',
    properties: {
      mean: { type: 'string' }
    }
  }

  fastify.get('/default', {
    handler (req, reply) { reply.send({ mean: 'default' }) },
    schema: { response: { 200: outSchema } }
  })

  let hit = 0
  fastify.register((instance, opts, done) => {
    instance.setSerializerCompiler(({ schema, method, url, httpStatus }) => {
      hit++
      return data => JSON.stringify({ mean: 'custom' })
    })
    instance.get('/custom', {
      handler (req, reply) { reply.send({}) },
      schema: { response: { 200: outSchema } }
    })
    instance.get('/route', {
      handler (req, reply) { reply.send({}) },
      serializerCompiler: ({ schema, method, url, httpPart }) => {
        hit++
        return data => JSON.stringify({ mean: 'route' })
      },
      schema: { response: { 200: outSchema } }
    })

    done()
  })

  let res = await fastify.inject('/default')
  t.equal(res.json().mean, 'default')

  res = await fastify.inject('/custom')
  t.equal(res.json().mean, 'custom')

  res = await fastify.inject('/route')
  t.equal(res.json().mean, 'route')

  t.equal(hit, 2, 'the custom and route serializer has been called')
})

test('Reply serializer win over serializer ', t => {
  t.plan(5)

  const fastify = Fastify()
  fastify.setReplySerializer(function (payload, statusCode) {
    t.same(payload, { name: 'Foo', work: 'Bar', nick: 'Boo' })
    return 'instance serializator'
  })

  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            name: { type: 'string' },
            work: { type: 'string' }
          }
        }
      }
    },
    serializerCompiler: ({ schema, method, url, httpPart }) => {
      t.ok(method, 'the custom compiler has been created')
      return () => {
        t.fail('the serializer must not be called when there is a reply serializer')
        return 'fail'
      }
    }
  }, function (req, reply) {
    reply.code(200).send({ name: 'Foo', work: 'Bar', nick: 'Boo' })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.same(res.payload, 'instance serializator')
    t.equal(res.statusCode, 200)
  })
})

test('Reply serializer win over serializer ', t => {
  t.plan(5)

  const fastify = Fastify()
  fastify.setReplySerializer(function (payload, statusCode) {
    t.same(payload, { name: 'Foo', work: 'Bar', nick: 'Boo' })
    return 'instance serializator'
  })

  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            name: { type: 'string' },
            work: { type: 'string' }
          }
        }
      }
    },
    serializerCompiler: ({ schema, method, url, httpPart }) => {
      t.ok(method, 'the custom compiler has been created')
      return () => {
        t.fail('the serializer must not be called when there is a reply serializer')
        return 'fail'
      }
    }
  }, function (req, reply) {
    reply.code(200).send({ name: 'Foo', work: 'Bar', nick: 'Boo' })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.same(res.payload, 'instance serializator')
    t.equal(res.statusCode, 200)
  })
})

test('The schema compiler recreate itself if needed', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.options('/', {
    schema: {
      response: { '2xx': { hello: { type: 'string' } } }
    }
  }, echoBody)

  fastify.register(function (fastify, options, done) {
    fastify.addSchema({
      $id: 'identifier',
      type: 'string',
      format: 'uuid'
    })

    fastify.get('/', {
      schema: {
        response: {
          '2xx': {
            foobarId: { $ref: 'identifier#' }
          }
        }
      }
    }, echoBody)

    done()
  })

  fastify.ready(err => { t.error(err) })
})

test('The schema changes the default error handler output', async t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/:code', {
    schema: {
      response: {
        '2xx': { hello: { type: 'string' } },
        501: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        '5xx': {
          type: 'object',
          properties: {
            customId: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => {
    if (request.params.code === '501') {
      return reply.code(501).send(new Error('501 message'))
    }
    const error = new Error('500 message')
    error.customId = 42
    reply.send(error)
  })

  let res = await fastify.inject('/501')
  t.equal(res.statusCode, 501)
  t.same(res.json(), { message: '501 message' })

  res = await fastify.inject('/500')
  t.equal(res.statusCode, 500)
  t.same(res.json(), { error: 'Internal Server Error', message: '500 message', customId: 42 })
})

test('do not crash if status code serializer errors', async t => {
  const fastify = Fastify()

  const requiresFoo = {
    properties: { foo: { type: 'string' } },
    required: ['foo']
  }

  const someUserErrorType2 = {
    properties: {
      code: { type: 'number' }
    },
    required: ['code']
  }

  fastify.get(
    '/',
    {
      schema: {
        query: requiresFoo,
        response: { 400: someUserErrorType2 }
      }
    },
    (request, reply) => {
      t.fail('handler, should not be called')
    }
  )

  const res = await fastify.inject({
    path: '/',
    query: {
      notfoo: true
    }
  })
  t.equal(res.statusCode, 500)
  t.same(res.json(), {
    statusCode: 500,
    error: 'Internal Server Error',
    message: '"code" is required!'
  })
})

test('custom schema serializer error, empty message', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/:code', {
    schema: {
      response: {
        '2xx': { hello: { type: 'string' } },
        501: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, (request, reply) => {
    if (request.params.code === '501') {
      return reply.code(501).send(new Error(''))
    }
  })

  const res = await fastify.inject('/501')
  t.equal(res.statusCode, 501)
  t.same(res.json(), { message: '' })
})

test('error in custom schema serialize compiler, throw FST_ERR_SCH_SERIALIZATION_BUILD error', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            some: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    serializerCompiler: () => {
      throw new Error('CUSTOM_ERROR')
    }
  }, function (req, reply) {
    reply.code(200).send({ some: 'thing' })
  })

  fastify.ready((err) => {
    t.equal(err.message, 'Failed building the serialization schema for GET: /, due to error CUSTOM_ERROR')
    t.equal(err.statusCode, 500)
    t.equal(err.code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
  })
})
