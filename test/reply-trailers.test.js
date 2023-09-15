'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { promisify } = require('node:util')
const sleep = promisify(setTimeout)

test('send trailers when payload is empty string', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
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
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
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
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
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
    reply.trailer('Content-MD5', function (reply, payload, done) {
      t.equal(data, payload)
      const hash = createHash('md5')
      hash.update(payload)
      done(null, hash.digest('hex'))
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
    reply.trailer('ETag', function (reply, payload, done) {
      t.same(payload, null)
      done(null, 'custom-etag')
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

test('send trailers when using async-await', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', async function (reply, payload) {
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

test('error in trailers should be ignored', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      done('error')
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
    t.notHas(res.trailers, 'etag')
    t.notHas(res.headers, 'content-length')
  })
})

test('should emit deprecation warning when using direct return', t => {
  t.plan(7)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload) {
      return 'custom-etag'
    })
    reply.send('')
  })

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, 'FSTDEP013')
  }
  t.teardown(() => process.removeListener('warning', onWarning))

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

test('trailer handler counter', t => {
  t.plan(2)

  const data = JSON.stringify({ hello: 'world' })
  const hash = createHash('md5')
  hash.update(data)
  const md5 = hash.digest('hex')

  t.test('callback with timeout', t => {
    t.plan(9)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Return-Early', function (reply, payload, done) {
        t.equal(data, payload)
        done(null, 'return')
      })
      reply.trailer('Content-MD5', function (reply, payload, done) {
        t.equal(data, payload)
        const hash = createHash('md5')
        hash.update(payload)
        setTimeout(() => {
          done(null, hash.digest('hex'))
        }, 500)
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
      t.equal(res.headers.trailer, 'return-early content-md5')
      t.equal(res.trailers['return-early'], 'return')
      t.equal(res.trailers['content-md5'], md5)
      t.notHas(res.headers, 'content-length')
    })
  })

  t.test('async-await', t => {
    t.plan(9)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Return-Early', async function (reply, payload) {
        t.equal(data, payload)
        return 'return'
      })
      reply.trailer('Content-MD5', async function (reply, payload) {
        t.equal(data, payload)
        const hash = createHash('md5')
        hash.update(payload)
        await sleep(500)
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
      t.equal(res.headers.trailer, 'return-early content-md5')
      t.equal(res.trailers['return-early'], 'return')
      t.equal(res.trailers['content-md5'], md5)
      t.notHas(res.headers, 'content-length')
    })
  })
})

test('removeTrailer', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.removeTrailer('ETag') // remove nothing
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
    })
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
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

test('remove all trailers', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      t.fail('it should not called as this trailer is removed')
      done(null, 'custom-etag')
    })
    reply.removeTrailer('ETag')
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
    })
    reply.removeTrailer('Should-Not-Call')
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.notOk(res.headers.trailer)
    t.notOk(res.trailers.etag)
    t.notOk(res.trailers['should-not-call'])
    t.notHas(res.headers, 'content-length')
  })
})

test('hasTrailer', t => {
  t.plan(10)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    t.equal(reply.hasTrailer('ETag'), false)
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
    })
    t.equal(reply.hasTrailer('ETag'), true)
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
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
