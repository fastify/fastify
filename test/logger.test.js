'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const split = require('split2')
const Fastify = require('..')
const pino = require('pino')

test('defaults to info level', t => {
  t.plan(12)
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
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')

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
})

test('test log stream', t => {
  t.plan(12)
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
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')

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
})

test('test error log stream', t => {
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

  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('kaboom'))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')

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
})

test('can use external logger instance', t => {
  const lines = [/^Server listening at /, /^incoming request$/, /^log success$/, /^request completed$/]
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    const regex = lines.shift()
    t.ok(regex.test(line.msg), '"' + line.msg + '" dont match "' + regex + '"')
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

  t.ok(fastify.log)
  t.is(typeof fastify.log, 'object')
})

test('The logger should accept a custom genReqId function', t => {
  t.plan(4)

  const fastify = Fastify({
    logger: {
      level: 'fatal',
      genReqId: function () {
        return 'a'
      }
    }
  })

  fastify.get('/', (req, reply) => {
    t.ok(req.raw.id)
    reply.send({ id: req.raw.id })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(payload.id, 'a')
      fastify.close()
    })
  })
})

test('reply.send logs an error if called twice in a row', t => {
  const lines = ['incoming request', 'request completed', 'Reply already sent', 'Reply already sent']
  t.plan(lines.length + 2)

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
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('logger can be silented', t => {
  t.plan(17)
  const fastify = Fastify({
    logger: false
  })
  t.ok(fastify.log)
  t.is(typeof fastify.log, 'object')
  t.is(typeof fastify.log.fatal, 'function')
  t.is(typeof fastify.log.error, 'function')
  t.is(typeof fastify.log.warn, 'function')
  t.is(typeof fastify.log.info, 'function')
  t.is(typeof fastify.log.debug, 'function')
  t.is(typeof fastify.log.trace, 'function')
  t.is(typeof fastify.log.child, 'function')

  const childLog = fastify.log.child()

  t.is(typeof childLog, 'object')
  t.is(typeof childLog.fatal, 'function')
  t.is(typeof childLog.error, 'function')
  t.is(typeof childLog.warn, 'function')
  t.is(typeof childLog.info, 'function')
  t.is(typeof childLog.debug, 'function')
  t.is(typeof childLog.trace, 'function')
  t.is(typeof childLog.child, 'function')
})

test('Should set a custom logLevel for a plugin', t => {
  const lines = ['incoming request', 'Hello', 'request completed']
  t.plan(7)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const logger = pino({ level: 'error' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', (req, reply) => {
    req.log.info('Hello') // we should not see this log
    reply.send({ hello: 'world' })
  })

  fastify.register(function (instance, opts, next) {
    instance.get('/plugin', (req, reply) => {
      req.log.info('Hello') // we should see this log
      reply.send({ hello: 'world' })
    })
    next()
  }, { logLevel: 'info' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/plugin'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('Should set a custom logLevel for every plugin', t => {
  const lines = ['incoming request', 'request completed', 'info', 'debug']
  t.plan(18)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.ok(line.level === 30 || line.level === 20)
    t.ok(lines.indexOf(line.msg) > -1)
  })

  const logger = pino({ level: 'error' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', (req, reply) => {
    req.log.warn('Hello') // we should not see this log
    reply.send({ hello: 'world' })
  })

  fastify.register(function (instance, opts, next) {
    instance.get('/info', (req, reply) => {
      req.log.info('info') // we should see this log
      req.log.debug('hidden log')
      reply.send({ hello: 'world' })
    })
    next()
  }, { logLevel: 'info' })

  fastify.register(function (instance, opts, next) {
    instance.get('/debug', (req, reply) => {
      req.log.debug('debug') // we should see this log
      req.log.trace('hidden log')
      reply.send({ hello: 'world' })
    })
    next()
  }, { logLevel: 'debug' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/info'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/debug'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('Should increase the log level for a specific plugin', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, 'Hello')
    t.ok(line.level === 50)
  })

  const logger = pino({ level: 'info' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, next) {
    instance.get('/', (req, reply) => {
      req.log.error('Hello') // we should see this log
      reply.send({ hello: 'world' })
    })
    next()
  }, { logLevel: 'error' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('Should set the log level for the customized 404 handler', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, 'Hello')
    t.ok(line.level === 50)
  })

  const logger = pino({ level: 'warn' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, next) {
    instance.setNotFoundHandler(function (req, reply) {
      req.log.error('Hello')
      reply.code(404).send()
    })
    next()
  }, { logLevel: 'error' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('Should set the log level for the customized 500 handler', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, 'Hello')
    t.ok(line.level === 60)
  })

  const logger = pino({ level: 'warn' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, next) {
    instance.get('/', (req, reply) => {
      req.log.error('kaboom')
      reply.send(new Error('kaboom'))
    })

    instance.setErrorHandler(function (e, reply) {
      reply.res.log.fatal('Hello')
      reply.code(500).send()
    })
    next()
  }, { logLevel: 'fatal' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
  })
})

test('Should set a custom log level for a specific route', t => {
  const lines = ['incoming request', 'Hello', 'request completed']
  t.plan(7)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const logger = pino({ level: 'error' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/log', { logLevel: 'info' }, (req, reply) => {
    req.log.info('Hello')
    reply.send({ hello: 'world' })
  })

  fastify.get('/no-log', (req, reply) => {
    req.log.info('Hello')
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/log'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/no-log'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('The default 404 handler logs the incoming request', t => {
  t.plan(5)

  const expectedMessages = ['incoming request', 'Not found', 'request completed']

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, expectedMessages.shift())
  })

  const logger = pino({ level: 'trace' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.inject({
    method: 'GET',
    url: '/not-found'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})
