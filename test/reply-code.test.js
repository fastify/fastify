'use strict'

const t = require('tap')
const { Readable } = require('stream')
const test = t.test
const Fastify = require('..')

test('code should handle null/undefined/float', t => {
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
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(res.json(), {
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
    t.error(error)
    t.equal(res.statusCode, 500)
    t.same(res.json(), {
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
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('code should handle 204', t => {
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
      t.pass('stream ended')
    })
    reply.status(204).send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/204'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 204)
    t.equal(res.payload, '')
    t.equal(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/undefined/204'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 204)
    t.equal(res.payload, '')
    t.equal(res.headers['content-length'], undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/stream/204'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 204)
    t.equal(res.payload, '')
    t.equal(res.headers['content-length'], undefined)
  })
})

test('code should handle onSend hook on 204', t => {
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
    t.error(error)
    t.equal(res.statusCode, 204)
    t.equal(res.payload, '')
    t.equal(res.headers['content-length'], undefined)
    t.equal(res.headers['content-type'], undefined)
  })
})
