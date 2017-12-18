'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const sget = require('simple-get').concat

test('fastify can add schemas and get cached schemas + stringifiers out', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addSchema({
    id: 'defs.json',
    definitions: {
      ref: {
        type: 'object',
        properties: {
          str: { type: 'string' }
        }
      }
    }
  })

  const validate = fastify.getSchema('defs.json#/definitions/ref')

  t.is(typeof validate, 'function')

  const valid = validate({
    str: 'test'
  })
  t.ok(valid)

  const cachedValidate = fastify.getSchema('defs.json#/definitions/ref')

  t.ok(validate === cachedValidate)
})

test('fastify uses custom schemaResolver with cached results', t => {
  t.plan(4)
  const fastify = Fastify()

  const validator = function () {
    return true
  }

  fastify.setSchemaResolver(function (keyRef, allSchemas) {
    t.is(keyRef, 'reference')
    t.deepEqual(allSchemas, { 'reference': { test: 'abcdef' } })
    return validator
  })

  fastify.addSchema({ test: 'abcdef' }, 'reference')

  const validate = fastify.getSchema('reference')
  t.is(validate, validator)
  t.is(validate, fastify.getSchema('reference'))
})

const withId = {
  schema: {
    querystring: {
      id: '12345',
      type: 'object',
      properties: {
        hello: {
          type: 'integer'
        }
      }
    }
  }
}

test('fastify handles cases where id is defined but schema doesn\'t exist by calling compile', t => {
  t.plan(2)
  const fastify = Fastify()
  try {
    fastify.head('/', withId, function (req, reply) {
      reply.code(200).send(null)
    })
  } catch (e) {
    t.fail()
  }
  fastify.listen(0, function (err) {
    if (err) {
      t.error(err)
    }

    fastify.server.unref()

    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port + '/?hello=world'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
    })
  })
})

const withRef = {
  schema: {
    response: {
      '2xx': '12345'
    }
  }
}

test('fastify serializers are isolated', t => {
  t.plan(4)

  function parallelTest (schema, example) {
    const fastify = Fastify()
    fastify.addSchema(schema)
    try {
      fastify.get('/', withRef, function (req, reply) {
        reply.code(200).send(example)
      })
    } catch (e) {
      t.fail()
    }

    fastify.listen(0, function (err) {
      if (err) {
        t.error(err)
      }

      fastify.server.unref()

      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.deepEqual(JSON.parse(body), example)
      })
    })
  }

  parallelTest({
    $id: '12345',
    type: 'object',
    properties: {
      num: {
        type: 'integer'
      }
    }
  }, {
    num: 0
  })

  parallelTest({
    $id: '12345',
    type: 'object',
    properties: {
      str: {
        type: 'string'
      }
    }
  }, {
    str: 'hello world'
  })
})
