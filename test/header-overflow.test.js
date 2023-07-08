'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

const maxHeaderSize = 1024

test('Should return 431 if request header fields are too large', t => {
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
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        'Large-Header': 'a'.repeat(maxHeaderSize)
      }
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 431)
    })
  })

  t.teardown(() => fastify.close())
})

test('Should return 431 if URI is too long', t => {
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
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + `/${'a'.repeat(maxHeaderSize)}`
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 431)
    })
  })

  t.teardown(() => fastify.close())
})
