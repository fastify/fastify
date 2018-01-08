'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fs = require('fs')
const resolve = require('path').resolve
const zlib = require('zlib')
const pump = require('pump')
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

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
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

    sget(`http://localhost:${fastify.server.address().port}/error`, function (err, response) {
      t.type(err, Error)
      t.equal(err.code, 'ECONNRESET')
      t.pass('Correctly close the stream')
    })
  })
})

test('should trigger the onSend hook', t => {
  t.plan(4)
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
  }, (err, res) => {
    t.error(err)
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

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response) {
      t.type(err, Error)
      t.equal(err.code, 'ECONNRESET')
    })
  })
})

test('onSend hook stream', t => {
  t.plan(4)
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
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.headers['content-encoding'], 'gzip')
    const file = fs.readFileSync(resolve(process.cwd() + '/test/stream.test.js'), 'utf8')
    const payload = zlib.gunzipSync(res.rawPayload)
    t.strictEqual(payload.toString('utf-8'), file)
    fastify.close()
  })
})

test('Destroying streams prematurely', t => {
  t.plan(3)

  const fastify = Fastify()
  const stream = require('stream')
  const http = require('http')

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    var sent = false
    var reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })

    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    var port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.strictEqual(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      response.on('close', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely with custom error handler set', t => {
  t.plan(7)

  const fastify = Fastify()
  const stream = require('stream')
  const http = require('http')

  fastify.setErrorHandler(function (err, reply) {
    t.type(err, Error)
    t.strictEqual(reply.sent, true)

    try {
      reply.send('error message')
      t.pass('sending a response after headers are sent should not error')
    } catch (error) {
      t.fail(error)
    }

    try {
      reply.send(new Error('error message'))
      t.pass('sending an error response after headers are sent should not error')
    } catch (error) {
      t.fail(error)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    var sent = false
    var reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })

    reply.send(reallyLongStream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    var port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.strictEqual(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      response.on('close', function () {
        t.pass('Response closed')
      })
    })
  })
})
