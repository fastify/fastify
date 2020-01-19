'use strict'

const { test } = require('tap')
const Fastify = require('..')
const { kSchemas } = require('../lib/symbols.js')

const echoParams = (req, reply) => { reply.send(req.params) }
const echoBody = (req, reply) => { reply.send(req.body) }

;['addSchema', 'getSchema', 'getSchemas', 'setValidatorCompiler', 'setSerializerCompiler'].forEach(f => {
  test(`Should expose ${f} function`, t => {
    t.plan(1)
    const fastify = Fastify()
    t.is(typeof fastify[f], 'function')
  })
})

test('The schemas should be added to an internal array', t => {
  t.plan(1)
  const fastify = Fastify()
  const schema = { $id: 'id', my: 'schema' }
  fastify.addSchema(schema)
  t.deepEqual(fastify[kSchemas].store, [schema])
})

test('The schemas should be accessible via getSchemas', t => {
  t.plan(1)
  const fastify = Fastify()

  const schemas = [
    { $id: 'id', my: 'schema' },
    { $id: 'abc', my: 'schema' },
    { $id: 'bcd', my: 'schema', properties: { a: 'a', b: 1 } }
  ]
  schemas.forEach(schema => { fastify.addSchema(schema) })
  t.deepEqual(fastify.getSchemas(), schemas)
})

test('The schema should be accessible by id via getSchema', t => {
  t.plan(3)
  const fastify = Fastify()

  const schemas = [
    { $id: 'id', my: 'schema' },
    { $id: 'abc', my: 'schema' },
    { $id: 'bcd', my: 'schema', properties: { a: 'a', b: 1 } }
  ]
  schemas.forEach(schema => { fastify.addSchema(schema) })
  t.deepEqual(fastify.getSchema('abc'), schemas[1])
  t.deepEqual(fastify.getSchema('id'), schemas[0])
  t.deepEqual(fastify.getSchema('foo'), undefined)
})

test('Should NOT throw if the $id property is missing', t => {
  t.plan(1)
  const fastify = Fastify()
  try {
    fastify.addSchema({ type: 'string' })
    t.pass()
  } catch (err) {
    t.fail()
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
    t.is(err.message, 'Schema with id \'id\' already declared!')
  }
})

test('Should throw of the schema does not exists in input', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/:id', {
    handler: echoParams,
    schema: {
      params: {
        name: { $ref: '#notExist' }
      }
    }
  })

  fastify.ready(err => {
    t.is(err.code, 'FST_ERR_SCH_VALIDATION_BUILD')
    t.is(err.message, "Failed building the validation schema for GET: /:id, due error can't resolve reference #notExist from id #")
  })
})

test('Should throw of the schema does not exists in output', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/:id', {
    handler: echoParams,
    schema: {
      response: {
        '2xx': {
          name: { $ref: '#notExist' }
        }
      }
    }
  })

  fastify.ready(err => {
    t.is(err.code, 'FST_ERR_SCH_SERIALIZATION_BUILD')
    t.is(err.message, "Failed building the serialization schema for GET: /:id, due error Cannot read property 'type' of undefined") // error from fast-json-strinfigy
  })
})

test('Should not change the input schemas', t => {
  t.plan(4)

  const theSchema = {
    $id: 'helloSchema',
    type: 'object',
    definitions: {
      hello: { type: 'string' }
    }
  }

  const fastify = Fastify()
  fastify.post('/', {
    handler: echoBody,
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { $ref: 'helloSchema#/definitions/hello' }
        }
      },
      response: {
        '2xx': {
          name: { $ref: 'helloSchema#/definitions/hello' }
        }
      }
    }
  })
  fastify.addSchema(theSchema)

  fastify.inject({
    url: '/',
    method: 'POST',
    payload: { name: 'Foo', surname: 'Bar' }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.json(), { name: 'Foo' })
    t.ok(theSchema.$id, 'the $id is not removed')
    t.deepEqual(fastify.getSchemas()[0], theSchema)
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

  fastify.get('/first/:id', {
    schema: {
      params: { id: { $ref: 'test#/properties/id' } }
    },
    handler: (req, reply) => {
      reply.send(typeof req.params.id)
    }
  })

  fastify.get('/second/:id', {
    schema: {
      params: { id: { $ref: 'test#/properties/id' } }
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
    instance.get('/:id', {
      handler: echoParams,
      schema: {
        params: { id: { $ref: 'encapsulation#/properties/id' } }
      }
    })
    next()
  })

  fastify.ready(err => {
    t.is(err.code, 'FST_ERR_SCH_VALIDATION_BUILD')
    t.is(err.message, "Failed building the validation schema for GET: /:id, due error can't resolve reference encapsulation#/properties/id from id #")
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

  fastify.ready(t.error)
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
    t.deepEqual(fastify.getSchemas(), [schemas.z])
    t.deepEqual(pluginDeepOneSide.getSchemas(), [schemas.z, schemas.a])
    t.deepEqual(pluginDeepOne.getSchemas(), [schemas.z, schemas.b])
    t.deepEqual(pluginDeepTwo.getSchemas(), [schemas.z, schemas.b, schemas.c])
  })
})

test('Use the same schema id in different places', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'test',
    type: 'object',
    properties: {
      id: { type: 'number' }
    }
  })

  fastify.get('/:id', {
    handler: echoParams,
    schema: {
      response: {
        200: {
          type: 'array',
          items: { $ref: 'test#/properties/id' }
        }
      }
    }
  })

  fastify.post('/:id', {
    handler: echoBody,
    schema: {
      body: { id: { $ref: 'test#/properties/id' } },
      response: {
        200: { id: { $ref: 'test#/properties/id' } }
      }
    }
  })

  fastify.ready(err => t.error(err))
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
      fastify.getSchema('first')
    ]
  })

  fastify.get('/', {
    handler: () => {},
    schema: {
      querystring: fastify.getSchema('second'),
      response: { 200: fastify.getSchema('second') }
    }
  })

  fastify.ready(err => t.error(err))
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
      fastify.getSchema('first')
    ]
  })

  fastify.get('/', {
    handler: () => {},
    schema: {
      querystring: fastify.getSchema('second'),
      response: { 200: fastify.getSchema('second') }
    }
  })

  fastify.ready(err => t.error(err))
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
      fastify.getSchema('first')
    ]
  })

  fastify.get('/', {
    handler: () => {},
    schema: {
      querystring: fastify.getSchema('second'),
      response: { 200: fastify.getSchema('second') }
    }
  })

  fastify.ready(err => t.error(err))
})

test('shared schema should be ignored in string enum', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/:lang', {
    handler: echoParams,
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
    }
  })

  fastify.inject('/C%23', (err, res) => {
    t.error(err)
    t.deepEqual(res.json(), { lang: 'C#' })
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

  fastify.post('/:lang', {
    handler: echoBody,
    schema: {
      body: fastify.getSchema('C')
    }
  })

  fastify.inject({
    url: '/',
    method: 'POST',
    payload: { lang: 'C#' }
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.json(), { lang: 'C#' })
  })
})
