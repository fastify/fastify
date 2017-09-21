'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')

const schemaWithFilter = {
  schema: {
    body: {
      additionalProperties: false,
      type: 'object',
      properties: {
        a: {
          type: 'integer'
        }
      }
    }
  }
}

const schemaWithDefaults = {
  schema: {
    body: {
      type: 'object',
      properties: {
        a: {
          type: 'integer', default: 100
        }
      }
    }
  }
}

test('ajv - removeAdditional', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      removeAdditional: true
    }
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    fastify.post('/', schemaWithFilter, function (req, reply) {
      t.deepEqual(req.body, { a: 1 })
      reply.code(200).send()
    })

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"a": 1, "b": 2}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.pass()
    })
  })
})

test('ajv - useDefaults', t => {
  t.plan(5)
  const fastify = Fastify({
    ajv: {
      useDefaults: true
    }
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    fastify.post('/', schemaWithDefaults, function (req, reply) {
      t.deepEqual(req.body, { a: 100 })
      reply.code(200).send()
    })

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.pass()
    })
  })
})
