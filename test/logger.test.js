'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const split = require('split2')
const Fastify = require('..')
const pino = require('pino')

test('defaults to info level', t => {
  t.plan(11)
  var fastify = null
  var stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream
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
    stream.once('data', line => {
      const id = line.reqId
      t.ok(line.reqId, 'reqId is defined')
      t.ok(line.req, 'req is defined')
      t.equal(line.msg, 'incoming request', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.equal(line.reqId, id)
        t.ok(line.reqId, 'reqId is defined')
        t.ok(line.res, 'res is defined')
        t.equal(line.msg, 'request completed', 'message is set')
        t.equal(line.res.statusCode, 200, 'statusCode is 200')
      })
    })
  })
})

test('test log stream', t => {
  t.plan(11)
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
    stream.once('data', line => {
      const id = line.reqId
      t.ok(line.reqId, 'reqId is defined')
      t.ok(line.req, 'req is defined')
      t.equal(line.msg, 'incoming request', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.equal(line.reqId, id)
        t.ok(line.reqId, 'reqId is defined')
        t.ok(line.res, 'res is defined')
        t.equal(line.msg, 'request completed', 'message is set')
        t.equal(line.res.statusCode, 200, 'statusCode is 200')
      })
    })
  })
})

test('test error log stream', t => {
  t.plan(10)
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
      t.ok(line.reqId, 'reqId is defined')
      t.ok(line.req, 'req is defined')
      t.equal(line.msg, 'incoming request', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')

      stream.once('data', line => {
        t.ok(line.reqId, 'reqId is defined')
        t.ok(line.res, 'res is defined')
        t.equal(line.msg, 'kaboom', 'message is set')
        t.equal(line.res.statusCode, 500, 'statusCode is 500')
      })
    })
  })
})

test('can use external logger instance', t => {
  const lines = ['incoming request', 'log success', 'request completed']
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

test('The logger should accept a custom genReqId function', t => {
  t.plan(3)

  const fastify = Fastify({
    logger: {
      level: 'fatal',
      genReqId: function () {
        return 'a'
      }
    }
  })

  fastify.get('/', (req, reply) => {
    t.ok(req.req.id)
    reply.send({ id: req.req.id })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, res => {
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, 'a')
      fastify.close()
    })
  })
})

test('reply.send logs an error if called twice in a row', t => {
  const lines = ['incoming request', 'Reply already sent', 'Reply already sent', 'request completed']
  t.plan(lines.length + 1)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const logger = pino(splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
    reply.send({ hello: 'world2' })
    reply.send({ hello: 'world3' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('logger can be silented', t => {
  t.plan(17)
  const fastify = Fastify({
    logger: false
  })
  t.ok(fastify.logger)
  t.is(typeof fastify.logger, 'object')
  t.is(typeof fastify.logger.fatal, 'function')
  t.is(typeof fastify.logger.error, 'function')
  t.is(typeof fastify.logger.warn, 'function')
  t.is(typeof fastify.logger.info, 'function')
  t.is(typeof fastify.logger.debug, 'function')
  t.is(typeof fastify.logger.trace, 'function')
  t.is(typeof fastify.logger.child, 'function')

  const childLogger = fastify.logger.child()

  t.is(typeof childLogger, 'object')
  t.is(typeof childLogger.fatal, 'function')
  t.is(typeof childLogger.error, 'function')
  t.is(typeof childLogger.warn, 'function')
  t.is(typeof childLogger.info, 'function')
  t.is(typeof childLogger.debug, 'function')
  t.is(typeof childLogger.trace, 'function')
  t.is(typeof childLogger.child, 'function')
})
