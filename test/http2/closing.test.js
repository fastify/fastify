'use strict'

const { test } = require('node:test')
const Fastify = require('../..')
const http2 = require('node:http2')
const { promisify } = require('node:util')
const connect = promisify(http2.connect)
const { once } = require('node:events')
const { buildCertificate } = require('../build-certificate')
const { getServerUrl } = require('../helper')

test.before(buildCertificate)

test('http/2 request while fastify closing', (t, done) => {
  let fastify
  try {
    fastify = Fastify({
      http2: true
    })
    t.assert.ok('http2 successfully loaded')
  } catch (e) {
    t.assert.fail('http2 loading failed')
  }

  fastify.get('/', () => Promise.resolve({}))

  t.after(() => { fastify.close() })
  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    const url = getServerUrl(fastify)
    const session = http2.connect(url, function () {
      this.request({
        ':method': 'GET',
        ':path': '/'
      }).on('response', headers => {
        t.assert.strictEqual(headers[':status'], 503)
        done()
        this.destroy()
      }).on('error', () => {
        // Nothing to do here,
        // we are not interested in this error that might
        // happen or not
      })
      session.on('error', () => {
        // Nothing to do here,
        // we are not interested in this error that might
        // happen or not
        done()
      })
      fastify.close()
    })
  })
})

test('http/2 request while fastify closing - return503OnClosing: false', (t, done) => {
  let fastify
  try {
    fastify = Fastify({
      http2: true,
      return503OnClosing: false
    })
    t.assert.ok('http2 successfully loaded')
  } catch (e) {
    t.assert.fail('http2 loading failed')
  }

  t.after(() => { fastify.close() })

  fastify.get('/', () => Promise.resolve({}))

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    const url = getServerUrl(fastify)
    const session = http2.connect(url, function () {
      this.request({
        ':method': 'GET',
        ':path': '/'
      }).on('response', headers => {
        t.assert.strictEqual(headers[':status'], 200)
        done()
        this.destroy()
      }).on('error', () => {
        // Nothing to do here,
        // we are not interested in this error that might
        // happen or not
      })
      fastify.close()
    })
    session.on('error', () => {
      // Nothing to do here,
      // we are not interested in this error that might
      // happen or not
      done()
    })
  })
})

test('http/2 closes successfully with async await', async t => {
  const fastify = Fastify({
    http2SessionTimeout: 100,
    http2: true
  })

  await fastify.listen({ port: 0 })

  const url = getServerUrl(fastify)
  const session = await connect(url)
  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await fastify.close()
})

test('https/2 closes successfully with async await', async t => {
  const fastify = Fastify({
    http2SessionTimeout: 100,
    http2: true,
    https: {
      key: global.context.key,
      cert: global.context.cert
    }
  })

  await fastify.listen({ port: 0 })

  const url = getServerUrl(fastify)
  const session = await connect(url)
  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await fastify.close()
})

test('http/2 server side session emits a timeout event', async t => {
  let _resolve
  const p = new Promise((resolve) => { _resolve = resolve })

  const fastify = Fastify({
    http2SessionTimeout: 100,
    http2: true
  })

  fastify.get('/', async (req) => {
    req.raw.stream.session.on('timeout', () => _resolve())
    return {}
  })

  await fastify.listen({ port: 0 })

  const url = getServerUrl(fastify)
  const session = await connect(url)
  const req = session.request({
    ':method': 'GET',
    ':path': '/'
  }).end()

  const [headers] = await once(req, 'response')
  t.assert.strictEqual(headers[':status'], 200)
  req.resume()

  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await p
  await fastify.close()
})
