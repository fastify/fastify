'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const fs = require('node:fs')
const resolve = require('node:path').resolve
const zlib = require('node:zlib')
const pipeline = require('node:stream').pipeline
const Fastify = require('..')

test('onSend hook stream', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    const gzStream = zlib.createGzip()

    reply.header('Content-Encoding', 'gzip')
    pipeline(
      fs.createReadStream(resolve(__filename), 'utf8'),
      gzStream,
      t.error
    )
    done(null, gzStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.headers['content-encoding'], 'gzip')
    const file = fs.readFileSync(resolve(__filename), 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.equal(payload.toString('utf-8'), file)
    fastify.close()
  })
})

test('onSend hook stream should work even if payload is not a proper stream', t => {
  t.plan(1)

  const reply = proxyquire('../lib/reply', {
    'node:stream': {
      finished: (...args) => {
        if (args.length === 2) { args[1](new Error('test-error')) }
      }
    }
  })
  const Fastify = proxyquire('..', {
    './lib/reply.js': reply
  })
  const spyLogger = {
    fatal: () => { },
    error: () => { },
    warn: (message) => {
      t.equal(message, 'stream payload does not end properly')
      fastify.close()
    },
    info: () => { },
    debug: () => { },
    trace: () => { },
    child: () => { return spyLogger }
  }

  const fastify = Fastify({ loggerInstance: spyLogger })
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.addHook('onSend', (req, reply, payload, done) => {
    const fakeStream = { pipe: () => { } }
    done(null, fakeStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  })
})

test('onSend hook stream should work on payload with "close" ending function', t => {
  t.plan(1)

  const reply = proxyquire('../lib/reply', {
    'node:stream': {
      finished: (...args) => {
        if (args.length === 2) { args[1](new Error('test-error')) }
      }
    }
  })
  const Fastify = proxyquire('..', {
    './lib/reply.js': reply
  })

  const fastify = Fastify({ logger: false })
  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })
  fastify.addHook('onSend', (req, reply, payload, done) => {
    const fakeStream = {
      pipe: () => { },
      close: (cb) => {
        cb()
        t.pass()
      }
    }
    done(null, fakeStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  })
})
