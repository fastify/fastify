'use strict'

const t = require('tap')
const test = t.test
const split = require('split2')
const Fastify = require('..')

test('Destroying streams prematurely', t => {
  t.plan(6)

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

test('Destroying streams prematurely should call close method', t => {
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

test('Destroying streams prematurely should call close method when destroy is not a function', t => {
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
