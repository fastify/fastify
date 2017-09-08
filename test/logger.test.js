'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const split = require('split2')
const Fastify = require('..')

test('test log stream', t => {
  t.plan(7)
  var fastify = null
  var stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }

  fastify.get('/', function (req, reply) {
    t.ok(req.log)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port)
    stream.on('data', line => {
      t.ok(line.req, 'req is defined')
      t.ok(line.res, 'res is defined')
      t.equal(line.msg, 'request completed', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')
      t.equal(line.res.statusCode, 200, 'statusCode is 200')
    })
  })
})

test('test error log stream', t => {
  t.plan(7)
  var fastify = null
  var stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }

  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('kaboom'))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port + '/error')
    stream.once('data', line => {
      t.ok(line.req, 'req is defined')
      t.ok(line.res, 'res is defined')
      t.equal(line.msg, 'kaboom', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')
      t.equal(line.res.statusCode, 500, 'statusCode is 500')
    })
  })
})

test('can use external logger instance', t => {
  const lines = ['log success', 'request completed']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const logger = require('pino')(splitStream)

  const localFastify = Fastify({logger: logger})

  localFastify.get('/foo', function (req, reply) {
    t.ok(req.log)
    req.log.info('log success')
    reply.send({ hello: 'world' })
  })

  localFastify.listen(0, err => {
    t.error(err)
    http.get('http://localhost:' + localFastify.server.address().port + '/foo', (res) => {
      res.resume()
      res.on('end', () => {
        localFastify.server.close()
      })
    })
  })
})

test('expose the logger', t => {
  t.plan(2)
  var fastify = null
  var stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.ok(fastify.logger)
  t.is(typeof fastify.logger, 'object')
})
