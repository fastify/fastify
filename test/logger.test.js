'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const split = require('split2')
const Fastify = require('..')
var fastify = null
var stream = split(JSON.parse)

try {
  fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  t.pass()
} catch (e) {
  t.fail()
}

fastify.get('/', function (req, reply) {
  t.ok(req.log)
  reply.send({ hello: 'world' })
})

test('test log stream', t => {
  t.plan(6)
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
      t.end()
    })
  })
})

test('can use external logger instance', t => {
  t.plan(7)

  const lines = []
  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    lines.push(line)
  })
  splitStream.on('end', () => {
    t.is(lines.length, 4)
    t.is(lines[0].msg, 'log success')
    t.is(lines[1].msg, 'log success')
    t.is(lines[2].msg, 'log success')
    t.is(lines[3].msg, 'request completed')
  })

  const logger = require('pino')(splitStream)
  logger.info('log success')

  const localFastify = Fastify({logger: logger})

  localFastify.get('/foo', function (req, reply) {
    t.ok(req.log)
    req.log.info('log success')
    reply.send({ hello: 'world' })
    setImmediate(() => {
      localFastify.server.close(() => {
        splitStream.end()
        localFastify.server.unref()
      })
    })
  })

  localFastify.listen(0, err => {
    t.error(err)
    logger.info('log success')
    http.get('http://localhost:' + localFastify.server.address().port + '/foo')
  })
})

test('expose the logger', t => {
  t.plan(2)
  t.ok(fastify.logger)
  t.is(typeof fastify.logger, 'function')
})
