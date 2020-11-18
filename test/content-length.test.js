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
      message: 'Request body is too large',
      statusCode: 413
    })
  })
})

test('default 400 with wrong content-length', t => {
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
      message: 'Request body size did not match Content-Length',
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
      message: 'Request body is too large',
      statusCode: 413
    })
  })
})

test('custom 400 with wrong content-length', t => {
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
      message: 'Request body size did not match Content-Length',
      statusCode: 400
    })
  })
})

test('#2214 - wrong content-length', t => {
  const fastify = Fastify()

  fastify.get('/', async () => {
    const error = new Error('MY_ERROR_MESSAGE')
    error.headers = {
      'content-length': 2
    }
    throw error
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  })
    .then(response => {
      t.strictEqual(response.headers['content-length'], '' + response.rawPayload.length)
      t.end()
    })
})

test('#2543 - wrong content-length with errorHandler', t => {
  const fastify = Fastify()

  fastify.setErrorHandler((_error, _request, reply) => {
    reply.code(500).send({ message: 'longer than 2 bytes' })
  })

  fastify.get('/', async () => {
    const error = new Error('MY_ERROR_MESSAGE')
    error.headers = {
      'content-length': 2
    }
    throw error
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  })
    .then(res => {
      t.strictEqual(res.statusCode, 500)
      t.strictEqual(res.headers['content-length'], '' + res.rawPayload.length)
      t.deepEqual(JSON.parse(res.payload), { message: 'longer than 2 bytes' })
      t.end()
    })
})
