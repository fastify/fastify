'use strict'

const t = require('tap')
require('./helper').payloadMethod('post', t)
require('./input-validation').payloadMethod('post', t)

const Fastify = require('..')

t.test('cannot set schemaCompiler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.setSchemaCompiler(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

t.test('should error with empty body and application/json content-type', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.is(payload.error, `Bad Request`)
    t.is(payload.message, `Body cannot be empty when content-type is set to 'application/json'`)
    t.strictEqual(res.statusCode, 400)
  })
})

t.test('should error with null body and application/json content-type', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: null,
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.is(payload.error, `Bad Request`)
    t.is(payload.message, `Body cannot be empty when content-type is set to 'application/json'`)
    t.strictEqual(res.statusCode, 400)
  })
})

t.test('should error with undefined body and application/json content-type', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.code(200).send(req.body.name)
  })

  fastify.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: undefined,
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.is(payload.error, `Bad Request`)
    t.is(payload.message, `Body cannot be empty when content-type is set to 'application/json'`)
    t.strictEqual(res.statusCode, 400)
  })
})
