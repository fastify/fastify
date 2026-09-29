'use strict'

const { test, describe } = require('node:test')
const net = require('node:net')
const Fastify = require('..')
const { Readable } = require('node:stream')
const { createHash } = require('node:crypto')
const { sleep } = require('./helper')

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

function rawRequest (port, method, path) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(`${method} ${path} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`)
    })
    const chunks = []
    socket.on('data', (chunk) => { chunks.push(chunk) })
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')))
    socket.on('error', reject)
  })
}

function parseRawResponse (text) {
  const [head, ...rest] = text.split('\r\n\r\n')
  const lines = head.split('\r\n')
  const headers = {}
  for (let i = 1; i < lines.length; i++) {
    const index = lines[i].indexOf(':')
    if (index === -1) continue
    headers[lines[i].slice(0, index).toLowerCase()] = lines[i].slice(index + 1).trim()
  }
  return {
    statusLine: lines[0],
    statusCode: Number(lines[0].split(' ')[1]),
    headers,
    body: rest.join('\r\n\r\n')
  }
}

test('omit trailers on bodyless statuses over a real socket', async (t) => {
  t.plan(12)

  const fastify = Fastify({ logger: false })
  t.after(() => fastify.close())

  const withTrailer = (reply, code) => {
    reply.code(code).trailer('x-t', function (_reply, _payload, done) {
      done(null, 'v')
    }).send('BODY')
  }

  for (const code of [200, 204, 304]) {
    fastify.get(`/${code}`, function (_request, reply) {
      withTrailer(reply, code)
    })
  }

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  const { port } = fastify.server.address()

  const ok = parseRawResponse(await rawRequest(port, 'GET', '/200'))
  t.assert.strictEqual(ok.statusCode, 200)
  t.assert.strictEqual(ok.headers['transfer-encoding'], 'chunked')
  t.assert.strictEqual(ok.headers.trailer, 'x-t')
  t.assert.ok(!ok.headers['content-length'])
  t.assert.match(ok.body, /x-t: v/)

  const noContent = parseRawResponse(await rawRequest(port, 'GET', '/204'))
  t.assert.strictEqual(noContent.statusCode, 204)
  t.assert.strictEqual(noContent.headers['transfer-encoding'], undefined)
  t.assert.strictEqual(noContent.headers.trailer, undefined)
  t.assert.ok(!noContent.body.includes('BODY'))

  const notModified = parseRawResponse(await rawRequest(port, 'GET', '/304'))
  t.assert.strictEqual(notModified.statusCode, 304)
  t.assert.strictEqual(notModified.headers['transfer-encoding'], undefined)
  t.assert.strictEqual(notModified.headers.trailer, undefined)
})

test('omit trailers on 205 over a real socket', async (t) => {
  t.plan(3)

  const fastify = Fastify({ logger: false })
  t.after(() => fastify.close())

  fastify.get('/205', function (_request, reply) {
    reply.code(205).trailer('x-t', function (_reply, _payload, done) {
      done(null, 'v')
    }).send('BODY')
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  const { port } = fastify.server.address()

  const reset = parseRawResponse(await rawRequest(port, 'GET', '/205'))
  t.assert.strictEqual(reset.statusCode, 205)
  t.assert.strictEqual(reset.headers.trailer, undefined)
  t.assert.ok(!reset.body.includes('x-t: v'))
})

test('auto-exposed HEAD must not send Content-Length with Transfer-Encoding', async (t) => {
  t.plan(8)

  const fastify = Fastify({ logger: false })
  t.after(() => fastify.close())

  fastify.head('/head-explicit', function (_request, reply) {
    reply.trailer('x-t', function (_reply, _payload, done) {
      done(null, 'v')
    }).send('BODY')
  })

  fastify.get('/head-auto', function (_request, reply) {
    reply.trailer('x-t', function (_reply, _payload, done) {
      done(null, 'v')
    }).send('BODY')
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  const { port } = fastify.server.address()

  const explicit = parseRawResponse(await rawRequest(port, 'HEAD', '/head-explicit'))
  t.assert.strictEqual(explicit.statusCode, 200)
  t.assert.strictEqual(explicit.headers['transfer-encoding'], 'chunked')
  t.assert.strictEqual(explicit.headers['content-length'], undefined)
  t.assert.strictEqual(explicit.body, '')

  const autoHead = parseRawResponse(await rawRequest(port, 'HEAD', '/head-auto'))
  t.assert.strictEqual(autoHead.statusCode, 200)
  t.assert.strictEqual(autoHead.headers['transfer-encoding'], 'chunked')
  t.assert.strictEqual(autoHead.headers['content-length'], undefined)
  t.assert.strictEqual(autoHead.body, '')
})

test('omit trailers when sending a Response with status 204', async (t) => {
  t.plan(4)

  const fastify = Fastify({ logger: false })
  t.after(() => fastify.close())

  fastify.get('/', function (_request, reply) {
    reply.trailer('x-t', function (_reply, _payload, done) {
      t.assert.fail('trailer should not be called for 204')
      done(null, 'v')
    })
    reply.send(new Response(null, { status: 204 }))
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })
  const { port } = fastify.server.address()

  const res = parseRawResponse(await rawRequest(port, 'GET', '/'))
  t.assert.strictEqual(res.statusCode, 204)
  t.assert.strictEqual(res.headers['transfer-encoding'], undefined)
  t.assert.strictEqual(res.headers.trailer, undefined)
  t.assert.ok(!res.body.includes('x-t: v'))
})
