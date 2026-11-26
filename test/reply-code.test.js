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

// RFC 9110 §15.3.6 (205) and §15.4.5 (304): neither response may carry a body.
// A 205 additionally needs an explicit zero length, because Node treats only
// 1xx, 204 and 304 as bodyless and would otherwise fall back to chunked
// encoding, emitting a "0\r\n\r\n" terminator on the wire.
for (const [statusCode, expectedContentLength] of [
  [205, '0'],
  [304, undefined]
]) {
  test(`code should handle ${statusCode}`, (t, done) => {
    t.plan(13)

    const fastify = Fastify()

    fastify.get(`/${statusCode}`, function (request, reply) {
      reply.status(statusCode)
      return null
    })

    fastify.get(`/undefined/${statusCode}`, function (request, reply) {
      reply.status(statusCode).send({ message: 'hello' })
    })

    fastify.get(`/stream/${statusCode}`, function (request, reply) {
      const stream = new Readable({
        read () {
          this.push(null)
        }
      })

      stream.on('end', () => {
        t.assert.ok('stream ended')
      })

      reply.status(statusCode).send(stream)
    })

    fastify.inject({
      method: 'GET',
      url: `/${statusCode}`
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, statusCode)
      t.assert.strictEqual(res.payload, '')
      t.assert.strictEqual(res.headers['content-length'], expectedContentLength)
    })

    fastify.inject({
      method: 'GET',
      url: `/undefined/${statusCode}`
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, statusCode)
      t.assert.strictEqual(res.payload, '')
      t.assert.strictEqual(res.headers['content-length'], expectedContentLength)
    })

    fastify.inject({
      method: 'GET',
      url: `/stream/${statusCode}`
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, statusCode)
      t.assert.strictEqual(res.payload, '')
      t.assert.strictEqual(res.headers['content-length'], expectedContentLength)
      done()
    })
  })
}

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
