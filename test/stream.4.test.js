'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const errors = require('http-errors')
const JSONStream = require('JSONStream')
const Readable = require('node:stream').Readable
const split = require('split2')
const Fastify = require('..')
const { kDisableRequestLogging } = require('../lib/symbols.js')

test('Destroying streams prematurely should call abort method', t => {
  t.plan(7)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('node:stream')
  const http = require('node:http')

  // Test that "premature close" errors are logged with level warn
  logStream.on('data', line => {
    if (line.res) {
      t.equal(line.msg, 'stream closed prematurely')
      t.equal(line.level, 30)
    }
  })

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = undefined
    reallyLongStream.close = undefined
    reallyLongStream.abort = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('Destroying streams prematurely, log is disabled', t => {
  t.plan(4)

  let fastify = null
  try {
    fastify = Fastify({
      logger: false
    })
  } catch (e) {
    t.fail()
  }
  const stream = require('node:stream')
  const http = require('node:http')

  fastify.get('/', function (request, reply) {
    reply.log[kDisableRequestLogging] = true

    let sent = false
    const reallyLongStream = new stream.Readable({
      read: function () {
        if (!sent) {
          this.push(Buffer.from('hello\n'))
        }
        sent = true
      }
    })
    reallyLongStream.destroy = true
    reallyLongStream.close = () => t.ok('called')
    reply.send(reallyLongStream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const port = fastify.server.address().port

    http.get(`http://localhost:${port}`, function (response) {
      t.equal(response.statusCode, 200)
      response.on('readable', function () {
        response.destroy()
      })
      // Node bug? Node never emits 'close' here.
      response.on('aborted', function () {
        t.pass('Response closed')
      })
    })
  })
})

test('should respond with a stream1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    const stream = JSONStream.stringify()
    reply.code(200).type('application/json').send(stream)
    stream.write({ hello: 'world' })
    stream.end({ a: 42 })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget(`http://localhost:${fastify.server.address().port}`, function (err, response, body) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json')
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), [{ hello: 'world' }, { a: 42 }])
    })
  })
})

test('return a 404 if the stream emits a 404 error', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    t.pass('Received request')

    const reallyLongStream = new Readable({
      read: function () {
        setImmediate(() => {
          this.emit('error', new errors.NotFound())
        })
      }
    })

    reply.send(reallyLongStream)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    const port = fastify.server.address().port

    sget(`http://localhost:${port}`, function (err, response) {
      t.error(err)
      t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      t.equal(response.statusCode, 404)
    })
  })
})
