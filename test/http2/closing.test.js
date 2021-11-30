'use strict'

const t = require('tap')
const Fastify = require('../..')
const http2 = require('http2')
const semver = require('semver')
const { promisify } = require('util')
const connect = promisify(http2.connect)
const { once } = require('events')

const { buildCertificate } = require('../build-certificate')
t.before(buildCertificate)

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

t.test('http/2 request while fastify closing', t => {
  let fastify
  try {
    fastify = Fastify({
      http2: true
    })
    t.pass('http2 successfully loaded')
  } catch (e) {
    t.fail('http2 loading failed', e)
  }

  fastify.get('/', () => Promise.resolve({}))

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    // Skipped because there is likely a bug on Node 8.
    t.test('return 200', { skip: semver.lt(process.versions.node, '10.15.0') }, t => {
      const url = getUrl(fastify)
      const session = http2.connect(url, function () {
        this.request({
          ':method': 'GET',
          ':path': '/'
        }).on('response', headers => {
          t.equal(headers[':status'], 503)
          t.end()
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
        t.end()
      })
    })

    t.end()
  })
})

t.test('http/2 request while fastify closing - return503OnClosing: false', t => {
  let fastify
  try {
    fastify = Fastify({
      http2: true,
      return503OnClosing: false
    })
    t.pass('http2 successfully loaded')
  } catch (e) {
    t.fail('http2 loading failed', e)
  }

  fastify.get('/', () => Promise.resolve({}))

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    // Skipped because there is likely a bug on Node 8.
    t.test('return 200', { skip: semver.lt(process.versions.node, '10.15.0') }, t => {
      const url = getUrl(fastify)
      const session = http2.connect(url, function () {
        this.request({
          ':method': 'GET',
          ':path': '/'
        }).on('response', headers => {
          t.equal(headers[':status'], 200)
          t.end()
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
        t.end()
      })
    })

    t.end()
  })
})

// Skipped because there is likely a bug on Node 8.
t.test('http/2 closes successfully with async await', { skip: semver.lt(process.versions.node, '10.15.0') }, async t => {
  const fastify = Fastify({
    http2SessionTimeout: 100,
    http2: true
  })

  await fastify.listen(0)

  const url = getUrl(fastify)
  const session = await connect(url)
  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await fastify.close()
})

// Skipped because there is likely a bug on Node 8.
t.test('https/2 closes successfully with async await', { skip: semver.lt(process.versions.node, '10.15.0') }, async t => {
  const fastify = Fastify({
    http2SessionTimeout: 100,
    http2: true,
    https: {
      key: global.context.key,
      cert: global.context.cert
    }
  })

  await fastify.listen(0)

  const url = getUrl(fastify)
  const session = await connect(url)
  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await fastify.close()
})

// Skipped because there is likely a bug on Node 8.
t.test('http/2 server side session emits a timeout event', { skip: semver.lt(process.versions.node, '10.15.0') }, async t => {
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

  await fastify.listen(0)

  const url = getUrl(fastify)
  const session = await connect(url)
  const req = session.request({
    ':method': 'GET',
    ':path': '/'
  }).end()

  const [headers] = await once(req, 'response')
  t.equal(headers[':status'], 200)
  req.resume()

  // An error might or might not happen, as it's OS dependent.
  session.on('error', () => {})
  await p
  await fastify.close()
})
