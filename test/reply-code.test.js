'use strict'

const { test } = require('node:test')
const { Readable } = require('node:stream')
const Fastify = require('..')

test('code should handle null/undefined/float', (t, done) => {
  t.plan(8)

  const fastify = Fastify()

  fastify.get('/null', function (request, reply) {
    reply.status(null).send()
  })

  fastify.get('/undefined', function (request, reply) {
    reply.status(undefined).send()
  })

  fastify.get('/404.5', function (request, reply) {
    reply.status(404.5).send()
  })

  fastify.inject({
    method: 'GET',
    url: '/null'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.deepStrictEqual(res.json(), {
      statusCode: 500,
      code: 'FST_ERR_BAD_STATUS_CODE',
      error: 'Internal Server Error',
      message: 'Called reply with an invalid status code: null'
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 500)
    t.assert.deepStrictEqual(res.json(), {
      statusCode: 500,
      code: 'FST_ERR_BAD_STATUS_CODE',
      error: 'Internal Server Error',
      message: 'Called reply with an invalid status code: undefined'
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/404.5'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 404)
    done()
  })
})

test('code should handle 204', (t, done) => {
  t.plan(13)

  const fastify = Fastify()

  fastify.get('/204', function (request, reply) {
    reply.status(204)
    return null
  })

  fastify.get('/undefined/204', function (request, reply) {
    reply.status(204).send({ message: 'hello' })
  })

  fastify.get('/stream/204', function (request, reply) {
    const stream = new Readable({
      read () {
        this.push(null)
      }
    })
    stream.on('end', () => {
      t.assert.ok('stream ended')
    })
    reply.status(204).send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/204'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined/204'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/stream/204'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
    done()
  })
})

test('code should handle 205', (t, done) => {
  t.plan(13)

  const fastify = Fastify()

  fastify.get('/205', function (request, reply) {
    reply.status(205)
    return null
  })

  fastify.get('/undefined/205', function (request, reply) {
    reply.status(205).send({ message: 'hello' })
  })

  fastify.get('/stream/205', function (request, reply) {
    const stream = new Readable({
      read () {
        this.push(null)
      }
    })
    stream.on('end', () => {
      t.assert.ok('stream ended')
    })
    reply.status(205).send(stream)
  })

  // RFC 9110 §15.3.6: a server MUST NOT generate content in a 205 response.
  // An explicit zero length is required because Node treats only 1xx, 204 and
  // 304 as bodyless and would otherwise fall back to chunked encoding, which
  // emits a "0\r\n\r\n" terminator on the wire.
  fastify.inject({
    method: 'GET',
    url: '/205'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 205)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], '0')
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined/205'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 205)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], '0')
  })

  fastify.inject({
    method: 'GET',
    url: '/stream/205'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 205)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], '0')
    done()
  })
})

test('code should handle 304', (t, done) => {
  t.plan(13)

  const fastify = Fastify()

  fastify.get('/304', function (request, reply) {
    reply.status(304)
    return null
  })

  fastify.get('/undefined/304', function (request, reply) {
    reply.status(304).send({ message: 'hello' })
  })

  fastify.get('/stream/304', function (request, reply) {
    const stream = new Readable({
      read () {
        this.push(null)
      }
    })
    stream.on('end', () => {
      t.assert.ok('stream ended')
    })
    reply.status(304).send(stream)
  })

  // RFC 9110 §15.4.5: a 304 response cannot contain a message body.
  fastify.inject({
    method: 'GET',
    url: '/304'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 304)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined/304'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 304)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/stream/304'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 304)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
    done()
  })
})

test('code should handle onSend hook on 204', (t, done) => {
  t.plan(5)

  const fastify = Fastify()
  fastify.addHook('onSend', async function (request, reply, payload) {
    return {
      ...payload,
      world: 'hello'
    }
  })

  fastify.get('/204', function (request, reply) {
    reply.status(204).send({
      hello: 'world'
    })
  })

  fastify.inject({
    method: 'GET',
    url: '/204'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 204)
    t.assert.strictEqual(res.payload, '')
    t.assert.strictEqual(res.headers['content-length'], undefined)
    t.assert.strictEqual(res.headers['content-type'], undefined)
    done()
  })
})
