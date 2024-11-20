'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

const maxHeaderSize = 1024

test('Should return 431 if request header fields are too large', (t, done) => {
  t.plan(3)

  const fastify = Fastify({ http: { maxHeaderSize } })
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (_req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Large-Header': 'a'.repeat(maxHeaderSize)
      }
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 431)
      done()
    })
  })

  t.after(() => fastify.close())
})

test('Should return 431 if URI is too long', (t, done) => {
  t.plan(3)

  const fastify = Fastify({ http: { maxHeaderSize } })
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (_req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + `/${'a'.repeat(maxHeaderSize)}`
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.statusCode, 431)
      done()
    })
  })

  t.after(() => fastify.close())
})
