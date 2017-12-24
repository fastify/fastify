'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
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

  fastify.post('/', schemaWithFilter, function (req, reply) {
    t.deepEqual(req.body, { a: 1 })
    reply.code(200).send({})
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: { a: 1, b: 2 },
      json: true
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

  fastify.post('/', schemaWithDefaults, function (req, reply) {
    t.deepEqual(req.body, { a: 100 })
    reply.code(200).send({})
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: {},
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.pass()
    })
  })
})
