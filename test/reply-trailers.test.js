'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Readable } = require('stream')

test('do not send trailers when request do not contain correct te', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.addTrailer('ETag', function (reply, payload) {
      t.fail('trailer should not be called.')
      return 'custom-etag'
    })
    reply.send(JSON.stringify({ hello: 'world' }))
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.notOk(res.headers.trailer)
    t.notOk(res.trailers.etag)
  })
})

test('do not send trailers when payload is empty', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.addTrailer('ETag', function (reply, payload) {
      t.fail('trailer should not be called.')
      return 'custom-etag'
    })
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      TE: 'trailers'
    }
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.notOk(res.headers.trailer)
    t.notOk(res.trailers.etag)
  })
})

test('send trailers when payload is json', t => {
  t.plan(6)

  const fastify = Fastify()
  const data = JSON.stringify({ hello: 'world' })

  fastify.get('/', function (request, reply) {
    reply.addTrailer('ETag', function (reply, payload) {
      t.equal(data, payload)
      return 'custom-etag'
    })
    reply.send(data)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      TE: 'trailers'
    }
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['transfer-encoding'], 'chunked')
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
  })
})

test('send trailers when payload is stream', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.addTrailer('ETag', function (reply, payload) {
      t.same(payload, null)
      return 'custom-etag'
    })
    const stream = Readable.from([JSON.stringify({ hello: 'world' })])
    reply.send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      TE: 'trailers'
    }
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['transfer-encoding'], 'chunked')
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
  })
})

test('throw error when trailer header name is not allowed', t => {
  const INVALID_TRAILERS = [
    'transfer-encoding',
    'content-length',
    'host',
    'cache-control',
    'max-forwards',
    'te',
    'authorization',
    'set-cookie',
    'content-encoding',
    'content-type',
    'content-range',
    'trailer'
  ]
  t.plan(INVALID_TRAILERS.length + 2)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    for (const key of INVALID_TRAILERS) {
      try {
        reply.addTrailer(key, () => {})
      } catch (err) {
        t.equal(err.message, `Called reply.addTrailer with an invalid header name: ${key}`)
      }
    }
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      TE: 'trailers'
    }
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
