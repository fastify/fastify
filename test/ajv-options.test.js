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

const schemaWithCustomFormat = {
  schema: {
    body: {
      type: 'object',
      properties: {
        a: {
          type: 'string',
          format: 'upper-case'
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
      reply.code(200).send({})
    })

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
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    fastify.post('/', schemaWithDefaults, function (req, reply) {
      t.deepEqual(req.body, { a: 100 })
      reply.code(200).send({})
    })

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

test('ajv - custom format', t => {
  t.plan(4)
  const fastify = Fastify({
    ajv: (Ajv, defaultOptions) => {
      return new Ajv(defaultOptions)
        .addFormat('upper-case', value => value.toUpperCase() === value)
    }
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    fastify.post('/', schemaWithCustomFormat, function (req, reply) {
      reply.code(200).send({})
    })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      body: { a: 'lower-case' },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 400)
      t.pass()
    })
  })
})
