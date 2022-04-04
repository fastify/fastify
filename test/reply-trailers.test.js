'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Readable } = require('stream')
const { createHash } = require('crypto')

test('send trailers when payload is empty string', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notHas(res.headers, 'content-length')
  })
})

test('send trailers when payload is empty buffer', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    reply.send(Buffer.alloc(0))
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notHas(res.headers, 'content-length')
  })
})

test('send trailers when payload is undefined', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    reply.send(undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notHas(res.headers, 'content-length')
  })
})

test('send trailers when payload is json', t => {
  t.plan(7)

  const fastify = Fastify()
  const data = JSON.stringify({ hello: 'world' })
  const hash = createHash('md5')
  hash.update(data)
  const md5 = hash.digest('hex')

  fastify.get('/', function (request, reply) {
    reply.trailer('Content-MD5', function (reply, payload) {
      t.equal(data, payload)
      const hash = createHash('md5')
      hash.update(payload)
      return hash.digest('hex')
    })
    reply.send(data)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['transfer-encoding'], 'chunked')
    t.equal(res.headers.trailer, 'content-md5')
    t.equal(res.trailers['content-md5'], md5)
    t.notHas(res.headers, 'content-length')
  })
})

test('send trailers when payload is stream', t => {
  t.plan(7)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload) {
      t.same(payload, null)
      return 'custom-etag'
    })
    const stream = Readable.from([JSON.stringify({ hello: 'world' })])
    reply.send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['transfer-encoding'], 'chunked')
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notHas(res.headers, 'content-length')
  })
})

test('removeTrailer', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.removeTrailer('ETag') // remove nothing
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    reply.trailer('Should-Not-Call', function (reply, payload) {
      t.fail('it should not called as this trailer is removed')
      return 'should-not-call'
    })
    reply.removeTrailer('Should-Not-Call')
    reply.send(undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notOk(res.trailers['should-not-call'])
    t.notHas(res.headers, 'content-length')
  })
})

test('hasTrailer', t => {
  t.plan(10)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    t.equal(reply.hasTrailer('ETag'), false)
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    t.equal(reply.hasTrailer('ETag'), true)
    reply.trailer('Should-Not-Call', function (reply, payload) {
      t.fail('it should not called as this trailer is removed')
      return 'should-not-call'
    })
    t.equal(reply.hasTrailer('Should-Not-Call'), true)
    reply.removeTrailer('Should-Not-Call')
    t.equal(reply.hasTrailer('Should-Not-Call'), false)
    reply.send(undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers.trailer, 'etag')
    t.equal(res.trailers.etag, 'custom-etag')
    t.notOk(res.trailers['should-not-call'])
    t.notHas(res.headers, 'content-length')
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
        reply.trailer(key, () => {})
      } catch (err) {
        t.equal(err.message, `Called reply.trailer with an invalid header name: ${key}`)
      }
    }
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('throw error when trailer header value is not function', t => {
  const INVALID_TRAILERS_VALUE = [
    undefined,
    null,
    true,
    false,
    'invalid',
    [],
    new Date(),
    {}
  ]
  t.plan(INVALID_TRAILERS_VALUE.length + 2)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    for (const value of INVALID_TRAILERS_VALUE) {
      try {
        reply.trailer('invalid', value)
      } catch (err) {
        t.equal(err.message, `Called reply.trailer('invalid', fn) with an invalid type: ${typeof value}. Expected a function.`)
      }
    }
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
