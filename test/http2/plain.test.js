'use strict'

const { test } = require('node:test')
const http2 = require('node:http2')
const { Readable } = require('node:stream')
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

test('http2 plain test', async t => {
  let fastify
  try {
    fastify = Fastify({
      http2: true
    })
    t.assert.ok(true, 'http2 successfully loaded')
  } catch (e) {
    t.assert.fail('http2 loading failed')
  }

  fastify.get('/', function (req, reply) {
    reply.code(200).send(msg)
  })

  fastify.get('/host', function (req, reply) {
    reply.code(200).send(req.host)
  })

  fastify.get('/hostname_port', function (req, reply) {
    reply.code(200).send({ hostname: req.hostname, port: req.port })
  })

  t.after(() => { fastify.close() })

  await fastify.listen({ port: 0 })

  await t.test('http get request', async (t) => {
    t.plan(3)

    const url = `http://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.headers[':status'], 200)
    t.assert.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)

    t.assert.deepStrictEqual(JSON.parse(res.body), msg)
  })

  await t.test('http host', async (t) => {
    t.plan(1)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/host`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(res.body, host)
  })
  await t.test('http hostname and port', async (t) => {
    t.plan(2)

    const host = `localhost:${fastify.server.address().port}`

    const url = `http://${host}/hostname_port`
    const res = await h2url.concat({ url })

    t.assert.strictEqual(JSON.parse(res.body).hostname, host.split(':')[0])
    t.assert.strictEqual(JSON.parse(res.body).port, parseInt(host.split(':')[1]))
  })
})

test('http2 response trailers do not use transfer-encoding', async t => {
  const fastify = Fastify({ http2: true })

  fastify.get('/', async (request, reply) => {
    reply.trailer('x-checksum', async () => 'abc')
    return 'hello'
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(() => {
    client.close()
    return fastify.close()
  })

  const response = await new Promise((resolve, reject) => {
    const request = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
      [http2.constants.HTTP2_HEADER_PATH]: '/'
    })
    const result = { body: '' }

    request.setEncoding('utf8')
    request.on('response', headers => {
      result.headers = headers
    })
    request.on('trailers', trailers => {
      result.trailers = trailers
    })
    request.on('data', chunk => {
      result.body += chunk
    })
    request.on('error', reject)
    request.on('end', () => resolve(result))
    request.end()
  })

  t.assert.strictEqual(response.headers[':status'], 200)
  t.assert.strictEqual(response.headers['transfer-encoding'], undefined)
  t.assert.strictEqual(response.headers.trailer, 'x-checksum')
  t.assert.strictEqual(response.body, 'hello')
  t.assert.strictEqual(response.trailers['x-checksum'], 'abc')
})

test('http2 removes invalid connection-specific response headers', async t => {
  const invalidHeaders = [
    ['connection', 'trailers'],
    ['http2-settings', 'setting'],
    ['keep-alive', 'timeout=5'],
    ['proxy-connection', 'keep-alive'],
    ['te', 'gzip'],
    ['transfer-encoding', 'chunked'],
    ['upgrade', 'websocket']
  ]
  const modes = ['header', 'response', 'stream']
  const fastify = Fastify({ http2: true })

  fastify.get('/:mode/:index', async (request, reply) => {
    const [header, value] = invalidHeaders[request.params.index]

    if (request.params.mode === 'response') {
      return new Response('hello', { headers: { [header]: value } })
    }

    if (request.params.mode === 'stream') {
      reply.raw.setHeader(header, value)
      return Readable.from('hello')
    }

    reply.header(header, value)
    return 'hello'
  })

  fastify.get('/valid-te', async (request, reply) => {
    reply.header('te', 'trailers')
    return 'hello'
  })

  fastify.get('/error', async () => {
    const error = new Error('boom')
    error.headers = { 'keep-alive': 'timeout=5' }
    throw error
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(() => {
    client.close()
    return fastify.close()
  })

  async function sendRequest (path) {
    return new Promise((resolve, reject) => {
      const request = client.request({
        [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
        [http2.constants.HTTP2_HEADER_PATH]: path
      })
      const result = { body: '' }

      request.setEncoding('utf8')
      request.on('response', headers => {
        result.headers = headers
      })
      request.on('data', chunk => {
        result.body += chunk
      })
      request.on('error', reject)
      request.on('end', () => resolve(result))
      request.end()
    })
  }

  for (const mode of modes) {
    for (let index = 0; index < invalidHeaders.length; index++) {
      const [header] = invalidHeaders[index]
      const response = await sendRequest(`/${mode}/${index}`)

      t.assert.strictEqual(response.headers[':status'], 200)
      t.assert.strictEqual(response.headers[header], undefined)
      t.assert.strictEqual(response.body, 'hello')
    }
  }

  const validTeResponse = await sendRequest('/valid-te')
  t.assert.strictEqual(validTeResponse.headers.te, 'trailers')
  t.assert.strictEqual(validTeResponse.body, 'hello')

  const errorResponse = await sendRequest('/error')
  t.assert.strictEqual(errorResponse.headers[':status'], 500)
  t.assert.strictEqual(errorResponse.headers['keep-alive'], undefined)
  t.assert.strictEqual(JSON.parse(errorResponse.body).message, 'boom')
})

test('http2 removes invalid Response headers before handling a consumed body', async t => {
  const fastify = Fastify({ http2: true })

  fastify.get('/', async () => {
    const response = new Response('hello', {
      headers: { 'keep-alive': 'timeout=5' }
    })
    await response.text()
    return response
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(() => {
    client.close()
    return fastify.close()
  })

  const response = await new Promise((resolve, reject) => {
    const request = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
      [http2.constants.HTTP2_HEADER_PATH]: '/'
    })
    const result = { body: '' }

    request.setEncoding('utf8')
    request.on('response', headers => {
      result.headers = headers
    })
    request.on('data', chunk => {
      result.body += chunk
    })
    request.on('error', reject)
    request.on('end', () => resolve(result))
    request.end()
  })

  t.assert.strictEqual(response.headers[':status'], 500)
  t.assert.strictEqual(response.headers['keep-alive'], undefined)
  t.assert.strictEqual(JSON.parse(response.body).code, 'FST_ERR_REP_RESPONSE_BODY_CONSUMED')
})

test('http2 large non-stream replies are sent completely', async t => {
  const modes = ['buffer', 'string']

  for (const mode of modes) {
    await t.test(mode, async t => {
      const fastify = Fastify({ http2: true })
      const payload = mode === 'buffer'
        ? Buffer.alloc((64 * 1024) + 1, 'a')
        : 'a'.repeat((64 * 1024) + 1)
      const contentLength = Buffer.byteLength(payload)

      fastify.get('/large', async (req, reply) => {
        reply.header('content-type', 'application/octet-stream')
        reply.header('content-length', contentLength)

        return payload
      })

      await fastify.listen({ port: 0, host: '127.0.0.1' })

      const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
      t.after(() => {
        client.close()
        return fastify.close()
      })

      await new Promise((resolve, reject) => {
        const large = client.request({
          [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
          [http2.constants.HTTP2_HEADER_PATH]: '/large'
        })
        const chunks = []

        large.on('error', reject)
        large.on('data', chunk => {
          chunks.push(chunk)
        })
        large.on('end', () => {
          t.assert.strictEqual(Buffer.concat(chunks).length, contentLength)
          resolve()
        })
        large.end()
      })
    })
  }
})

test('http2 large buffer replies can be cancelled without rejecting the next stream', async t => {
  const fastify = Fastify({ http2: true })
  const payload = Buffer.alloc(32 * 1024 * 1024, 'a')
  let smallHit = false

  fastify.get('/large', async (req, reply) => {
    reply.header('content-type', 'application/octet-stream')
    reply.header('content-length', payload.length)

    return payload
  })

  fastify.get('/small', async () => {
    smallHit = true
    return 'ok'
  })

  await fastify.listen({ port: 0, host: '127.0.0.1' })

  const client = http2.connect(`http://127.0.0.1:${fastify.server.address().port}`)
  t.after(() => {
    client.close()
    return fastify.close()
  })

  await new Promise((resolve, reject) => {
    let cancelTimer
    let requestTimer
    let timeout

    function cleanup () {
      clearTimeout(cancelTimer)
      clearTimeout(requestTimer)
      clearTimeout(timeout)
    }

    const large = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
      [http2.constants.HTTP2_HEADER_PATH]: '/large'
    })
    let largeResponded = false

    large.on('error', err => {
      if (!largeResponded) {
        cleanup()
        reject(err)
      }
    })
    large.on('response', () => {
      largeResponded = true
      large.pause()
      cancelTimer = setTimeout(() => {
        large.close(http2.constants.NGHTTP2_CANCEL)
      }, 100)
      requestTimer = setTimeout(() => {
        const small = client.request({
          [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
          [http2.constants.HTTP2_HEADER_PATH]: '/small'
        })
        let body = ''

        timeout = setTimeout(() => {
          cleanup()
          reject(new Error('timed out waiting for /small response'))
        }, 3000)

        small.setEncoding('utf8')
        small.on('error', err => {
          cleanup()
          reject(err)
        })
        small.on('data', chunk => {
          body += chunk
        })
        small.on('end', () => {
          cleanup()
          t.assert.strictEqual(body, 'ok')
          t.assert.strictEqual(smallHit, true)
          resolve()
        })
        small.end()
      }, 200)
    })
    large.end()
  })
})
