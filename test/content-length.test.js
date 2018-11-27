'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('default 413 with bodyLimit option', t => {
  t.plan(4)

  const fastify = Fastify({
    bodyLimit: 10
  })

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 413)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Payload Too Large',
      code: 'FST_ERR_CTP_BODY_TOO_LARGE',
      message: 'FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large',
      statusCode: 413
    })
  })
})

test('default 413 with wrong content-length', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: {
      'content-length': 20
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 400)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      code: 'FST_ERR_CTP_INVALID_CONTENT_LENGTH',
      message: 'FST_ERR_CTP_INVALID_CONTENT_LENGTH: Request body size did not match Content-Length',
      statusCode: 400
    })
  })
})

test('custom 413 with bodyLimit option', t => {
  t.plan(4)

  const fastify = Fastify({
    bodyLimit: 10
  })

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setErrorHandler(function (err, request, reply) {
    reply
      .code(err.statusCode)
      .type('application/json; charset=utf-8')
      .send(err)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 413)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Payload Too Large',
      code: 'FST_ERR_CTP_BODY_TOO_LARGE',
      message: 'FST_ERR_CTP_BODY_TOO_LARGE: Request body is too large',
      statusCode: 413
    })
  })
})

test('custom 413 with wrong content-length', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setErrorHandler(function (err, request, reply) {
    reply
      .code(err.statusCode)
      .type('application/json; charset=utf-8')
      .send(err)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: {
      'content-length': 20
    },
    body: {
      text: '12345678901234567890123456789012345678901234567890'
    }
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 400)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
    t.deepEqual(JSON.parse(res.payload), {
      error: 'Bad Request',
      code: 'FST_ERR_CTP_INVALID_CONTENT_LENGTH',
      message: 'FST_ERR_CTP_INVALID_CONTENT_LENGTH: Request body size did not match Content-Length',
      statusCode: 400
    })
  })
})
