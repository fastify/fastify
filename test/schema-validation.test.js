'use strict'

const { test } = require('tap')
const Fastify = require('..')

const AJV = require('ajv')
const ajvMergePatch = require('ajv-merge-patch')

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
    t.deepEqual(res.payload, 'michelangelo')
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'POST',
    payload: { name: 'michelangelo' },
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.deepEqual(res.json(), { statusCode: 400, error: 'Bad Request', message: "body should have required property 'work'" })
    t.strictEqual(res.statusCode, 400)
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

  fastify.setValidatorCompiler((method, url, httpPart, schema) => {
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
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 'not a number' }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 400)
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

  fastify.register((instance, opts, next) => {
    const validator = (method, url, httpPart, schema) => {
      return ajv.compile(schema)
    }
    instance.setValidatorCompiler(validator)
    instance.post('/one', {
      handler (req, reply) { reply.send({ foo: 'one' }) },
      schema: {
        body: ajv.getSchema('urn:schema:response').schema
      }
    })

    instance.register((instance, opts, next) => {
      instance.post('/two', {
        handler (req, reply) {
          t.deepEquals(instance.validatorCompiler, validator)
          reply.send({ foo: 'two' })
        },
        schema: {
          body: ajv.getSchema('urn:schema:response').schema
        }
      })

      const anotherValidator = (method, url, httpPart, schema) => {
        return () => { return true } // always valid
      }
      instance.post('/three', {
        validatorCompiler: anotherValidator,
        handler (req, reply) {
          t.deepEquals(instance.validatorCompiler, validator, 'the route validator does not change the instance one')
          reply.send({ foo: 'three' })
        },
        schema: {
          body: ajv.getSchema('urn:schema:response').schema
        }
      })
      next()
    })
    next()
  })

  fastify.register((instance, opts, next) => {
    instance.post('/clean', function (req, reply) {
      t.equals(instance.validatorCompiler, null)
      reply.send({ foo: 'bar' })
    })
    next()
  })

  fastify.inject({
    method: 'POST',
    url: '/one',
    payload: { foo: 1 }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { foo: 'one' })
  })

  fastify.inject({
    method: 'POST',
    url: '/one',
    payload: { wrongFoo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 400)
  })

  fastify.inject({
    method: 'POST',
    url: '/two',
    payload: { foo: 2 }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { foo: 'two' })
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
    url: '/three',
    payload: { wrongFoo: 'but works' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { foo: 'three' })
  })

  fastify.inject({
    method: 'POST',
    url: '/clean',
    payload: { wrongFoo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { foo: 'bar' })
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

  fastify.setValidatorCompiler((method, url, httpPart, schema) => {
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
    t.equals(res.statusCode, 200)
    t.deepEquals(res.json(), { foo: 105 })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { fool: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.equals(res.statusCode, 400)
    t.deepEquals(res.json().message, "body should have required property 'foo'")
  })
})
