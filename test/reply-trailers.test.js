'use strict'

const { test, describe } = require('node:test')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { sleep, getServerUrl } = require('./helper')
const http = require('node:http')

function getWithTrailers (url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          trailers: res.trailers,
          body: Buffer.concat(chunks).toString()
        })
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.end()
  })
}

test('send trailers when payload is empty string', (t, testDone) => {
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('send trailers when payload is empty buffer', (t, testDone) => {
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('send trailers when payload is undefined', (t, testDone) => {
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('send trailers when payload is json', (t, testDone) => {
  t.plan(7)

  const fastify = Fastify()
  const data = JSON.stringify({ hello: 'world' })
  const hash = createHash('md5')
  hash.update(data)
  const md5 = hash.digest('hex')

  fastify.get('/', function (request, reply) {
    reply.trailer('Content-MD5', function (reply, payload, done) {
      t.assert.strictEqual(data, payload)
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    t.assert.strictEqual(res.headers.trailer, 'content-md5')
    t.assert.strictEqual(res.trailers['content-md5'], md5)
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('send trailers when payload is stream', (t, testDone) => {
  t.plan(7)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      t.assert.deepStrictEqual(payload, null)
      done(null, 'custom-etag')
    })
    const stream = Readable.from([JSON.stringify({ hello: 'world' })])
    reply.send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

// fastify.inject() never touches a real socket, so it cannot observe
// the res.end() race between Readable#pipe() and the trailer flush.
describe('trailers over a real socket', () => {
  test('send trailers when payload is a Readable stream', async (t) => {
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('ETag', function (reply, payload, done) {
        done(null, 'custom-etag')
      })
      const stream = Readable.from([JSON.stringify({ hello: 'world' })])
      reply.send(stream)
    })

    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    const res = await getWithTrailers(getServerUrl(fastify))
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.strictEqual(res.body, JSON.stringify({ hello: 'world' }))
  })

  test('send trailers when payload is a web ReadableStream', async (t) => {
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('ETag', function (reply, payload, done) {
        done(null, 'custom-etag')
      })
      const webStream = new ReadableStream({
        start (controller) {
          controller.enqueue(Buffer.from(JSON.stringify({ hello: 'world' })))
          controller.close()
        }
      })
      reply.send(webStream)
    })

    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    const res = await getWithTrailers(getServerUrl(fastify))
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.strictEqual(res.body, JSON.stringify({ hello: 'world' }))
  })

  test('send trailers when payload is a pre-ended Readable stream', async (t) => {
    const fastify = Fastify()

    // drain the stream and let 'end' pass before it is ever handed to
    // send(), so sendStream() attaches its listeners after the stream
    // is already done. the route handler stays synchronous so fastify's
    // async "did the handler forget to send" rescue in wrap-thenable
    // never gets a chance to paper over a stuck response.
    const stream = Readable.from([JSON.stringify({ hello: 'world' })])
    stream.resume()
    await new Promise((resolve) => stream.on('end', resolve))

    fastify.get('/', function (request, reply) {
      reply.trailer('ETag', function (reply, payload, done) {
        done(null, 'custom-etag')
      })
      reply.send(stream)
    })

    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    const res = await Promise.race([
      getWithTrailers(getServerUrl(fastify)),
      new Promise((resolve, reject) => {
        const hangTimer = setTimeout(() => reject(new Error('response hung')), 2000)
        t.after(() => clearTimeout(hangTimer))
      })
    ])
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.strictEqual(res.body, '')
  })

  test('stream response with no trailers registered ends normally', async (t) => {
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      const stream = Readable.from(['no-trailer-payload'])
      reply.send(stream)
    })

    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    const res = await getWithTrailers(getServerUrl(fastify))
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.deepStrictEqual(res.trailers, {})
    t.assert.strictEqual(res.body, 'no-trailer-payload')
  })

  test('stream error before end does not hang the response', async (t) => {
    const fastify = Fastify({ logger: false })

    fastify.get('/', function (request, reply) {
      reply.trailer('ETag', function (reply, payload, done) {
        done(null, 'custom-etag')
      })
      const stream = new Readable({
        read () {
          this.push('partial-data')
          process.nextTick(() => this.destroy(new Error('boom')))
        }
      })
      reply.send(stream)
    })

    await fastify.listen({ port: 0 })
    t.after(() => fastify.close())

    await new Promise((resolve, reject) => {
      const req = http.request(getServerUrl(fastify), (res) => {
        res.on('data', () => {})
        res.on('error', () => resolve())
        res.on('close', () => resolve())
        res.on('end', () => resolve())
      })
      req.on('error', () => resolve())
      req.end()
      const hangTimer = setTimeout(() => reject(new Error('response hung')), 2000)
      t.after(() => clearTimeout(hangTimer))
    })
  })
})

test('remove trailer while stream is being consumed', (t, testDone) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = Readable.from((function * () {
      reply.removeTrailer('ETag')
      yield 'hello'
    })())

    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })

    reply.send(stream)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.payload, 'hello')
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, undefined)
    testDone()
  })
})

test('send trailers when using async-await', (t, testDone) => {
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('error in trailers should be ignored', (t, testDone) => {
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
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.ok(!res.trailers['etag'])
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('send is called once when multiple trailer callbacks run synchronously', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()
  let endCalls = 0
  let addTrailersCalls = 0

  fastify.get('/', function (request, reply) {
    const originalEnd = reply.raw.end.bind(reply.raw)
    reply.raw.end = function (...args) {
      endCalls++
      return originalEnd(...args)
    }
    const originalAddTrailers = reply.raw.addTrailers.bind(reply.raw)
    reply.raw.addTrailers = function (...args) {
      addTrailersCalls++
      return originalAddTrailers(...args)
    }
    reply.trailer('Return-Early', function (reply, payload, done) {
      done(null, 'a')
    })
    reply.trailer('Content-MD5', function (reply, payload, done) {
      done(null, 'b')
    })
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.trailers['return-early'], 'a')
    t.assert.strictEqual(res.trailers['content-md5'], 'b')
    t.assert.strictEqual(endCalls, 1)
    t.assert.strictEqual(addTrailersCalls, 1)
    testDone()
  })
})

describe('trailer handler counter', () => {
  const data = JSON.stringify({ hello: 'world' })
  const hash = createHash('md5')
  hash.update(data)
  const md5 = hash.digest('hex')

  test('callback with timeout', (t, testDone) => {
    t.plan(9)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Return-Early', function (reply, payload, done) {
        t.assert.strictEqual(data, payload)
        done(null, 'return')
      })
      reply.trailer('Content-MD5', function (reply, payload, done) {
        t.assert.strictEqual(data, payload)
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
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, 200)
      t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
      t.assert.strictEqual(res.headers.trailer, 'return-early content-md5')
      t.assert.strictEqual(res.trailers['return-early'], 'return')
      t.assert.strictEqual(res.trailers['content-md5'], md5)
      t.assert.ok(!res.headers['content-length'])
      testDone()
    })
  })

  test('async-await', (t, testDone) => {
    t.plan(9)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Return-Early', async function (reply, payload) {
        t.assert.strictEqual(data, payload)
        return 'return'
      })
      reply.trailer('Content-MD5', async function (reply, payload) {
        t.assert.strictEqual(data, payload)
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
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, 200)
      t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
      t.assert.strictEqual(res.headers.trailer, 'return-early content-md5')
      t.assert.strictEqual(res.trailers['return-early'], 'return')
      t.assert.strictEqual(res.trailers['content-md5'], md5)
      t.assert.ok(!res.headers['content-length'])
      testDone()
    })
  })

  test('mixed callback and promise trailers only use the first completion', (t, testDone) => {
    t.plan(7)
    const fastify = Fastify()

    fastify.get('/', function (request, reply) {
      reply.trailer('Async', function (reply, payload, done) {
        setTimeout(() => done(null, 'async'), 10)
      })
      reply.trailer('Mixed', function (reply, payload, done) {
        done(null, 'correct')
        return Promise.resolve('corrupted')
      })
      reply.send('hello')
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (error, res) => {
      t.assert.ifError(error)
      t.assert.strictEqual(res.statusCode, 200)
      t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
      t.assert.strictEqual(res.headers.trailer, 'async mixed')
      t.assert.strictEqual(res.trailers.async, 'async')
      t.assert.strictEqual(res.trailers.mixed, 'correct')
      t.assert.ok(!res.headers['content-length'])
      testDone()
    })
  })
})

test('removeTrailer', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.removeTrailer('ETag') // remove nothing
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
    })
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
    })
    reply.removeTrailer('Should-Not-Call')
    reply.send(undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.trailers['should-not-call'])
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('remove all trailers', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'custom-etag')
    })
    reply.removeTrailer('ETag')
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
    })
    reply.removeTrailer('Should-Not-Call')
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, undefined)
    t.assert.strictEqual(res.trailers.etag, undefined)
    t.assert.strictEqual(res.trailers['should-not-call'], undefined)
    t.assert.strictEqual(res.headers['content-length'], '0')
    testDone()
  })
})

test('remove some trailers should keep trailer mode for the remaining ones', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })
    reply.removeTrailer('ETag')
    reply.trailer('Content-MD5', function (reply, payload, done) {
      done(null, 'custom-md5')
    })
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'content-md5')
    t.assert.strictEqual(res.headers['transfer-encoding'], 'chunked')
    t.assert.strictEqual(res.headers['content-length'], undefined)
    t.assert.strictEqual(res.trailers['content-md5'], 'custom-md5')
    testDone()
  })
})

test('remove all trailers should behave like no trailers were registered', (t, testDone) => {
  t.plan(6)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('ETag', function () {
      t.assert.fail('removed trailer should not be called')
    })
    reply.removeTrailer('ETag')
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, undefined)
    t.assert.strictEqual(res.headers['transfer-encoding'], undefined)
    t.assert.strictEqual(res.headers['content-length'], '5')
    t.assert.strictEqual(res.trailers.etag, undefined)
    testDone()
  })
})

test('hasTrailer', (t, testDone) => {
  t.plan(10)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    t.assert.strictEqual(reply.hasTrailer('ETag'), false)
    reply.trailer('ETag', function (reply, payload, done) {
      done(null, 'custom-etag')
    })
    t.assert.strictEqual(reply.hasTrailer('ETag'), true)
    reply.trailer('Should-Not-Call', function (reply, payload, done) {
      t.assert.fail('it should not called as this trailer is removed')
      done(null, 'should-not-call')
    })
    t.assert.strictEqual(reply.hasTrailer('Should-Not-Call'), true)
    reply.removeTrailer('Should-Not-Call')
    t.assert.strictEqual(reply.hasTrailer('Should-Not-Call'), false)
    reply.send(undefined)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.headers.trailer, 'etag')
    t.assert.strictEqual(res.trailers.etag, 'custom-etag')
    t.assert.ok(!res.trailers['should-not-call'])
    t.assert.ok(!res.headers['content-length'])
    testDone()
  })
})

test('throw error when trailer header name is not allowed', (t, testDone) => {
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
        reply.trailer(key, () => { })
      } catch (err) {
        t.assert.strictEqual(err.message, `Called reply.trailer with an invalid header name: ${key}`)
      }
    }
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    testDone()
  })
})

test('throw error when trailer header value is not function', (t, testDone) => {
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
        t.assert.strictEqual(err.message, `Called reply.trailer('invalid', fn) with an invalid type: ${typeof value}. Expected a function.`)
      }
    }
    reply.send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    testDone()
  })
})
