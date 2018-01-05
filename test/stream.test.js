'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get')
const fs = require('fs')
const resolve = require('path').resolve
const zlib = require('zlib')
const pump = require('pump')
const stream = require('stream')
const crypto = require('crypto')
const Fastify = require('..')

test('should respond with a stream', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.get('/error', function (req, reply) {
    const stream = fs.createReadStream('not-existing-file', 'utf8')
    reply.code(200).send(stream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget.concat(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.strictEqual(response.statusCode, 200)

      response.on('error', err => {
        t.error(err)
      })
      response.on('end', () => {
        t.pass('Correctly close the stream')
      })
    })

    sget.concat(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.type(err, Error)
      t.equal(err.code, 'ECONNRESET')
      t.pass('Correctly close the stream')
    })
  })
})

test('should trigger the onSend hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream(__filename, 'utf8'))
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.ok(payload._readableState)
    reply.header('Content-Type', 'application/javascript')
    next()
  })

  fastify.inject({
    url: '/'
  }, res => {
    t.strictEqual(res.headers['content-type'], 'application/javascript')
    t.strictEqual(res.payload, fs.readFileSync(__filename, 'utf8'))
    fastify.close()
  })
})

test('should trigger the onSend hook only once if pumping the stream fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(fs.createReadStream('not-existing-file', 'utf8'))
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.ok(payload._readableState)
    next()
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    sget.concat(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.type(err, Error)
      t.equal(err.code, 'ECONNRESET')
    })
  })
})

test('onSend hook stream', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    const gzStream = zlib.createGzip()

    reply.header('Content-Encoding', 'gzip')
    pump(
      fs.createReadStream(resolve(process.cwd() + '/test/stream.test.js'), 'utf8'),
      gzStream,
      t.error
    )
    next(null, gzStream)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, res => {
    t.strictEqual(res.headers['content-encoding'], 'gzip')
    const file = fs.readFileSync(resolve(process.cwd() + '/test/stream.test.js'), 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
    fastify.close()
  })
})

test('disconnecting from a stream response should not crash the server', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    const endlessStream = new stream.Readable({
      read (size) {
        this.push(crypto.randomBytes(size))
      }
    })
    reply.send(endlessStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    const req = sget(`http://localhost:${fastify.server.address().port}`, (err, res) => {
      t.error(err)
      req.abort()
      t.ok(res)
    })
  })
})
