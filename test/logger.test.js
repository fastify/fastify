'use strict'

const { test, tearDown } = require('tap')
const http = require('http')
const stream = require('stream')
const split = require('split2')
const Fastify = require('..')
const pino = require('pino')
const path = require('path')
const os = require('os')
const fs = require('fs')
const sget = require('simple-get').concat

const files = []
let count = 0

function file () {
  const file = path.join(os.tmpdir(), `sonic-boom-${process.pid}-${process.hrtime().toString()}-${count++}`)
  files.push(file)
  return file
}

tearDown(() => {
  files.forEach((file) => {
    try {
      fs.unlinkSync(file)
    } catch (e) {
      console.log(e)
    }
  })
})

test('defaults to info level', t => {
  t.plan(13)
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
        t.ok(line.responseTime, 'responseTime is defined')
      })
    })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port)
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

  const localFastify = Fastify({ logger: logger })

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

test('can use external logger instance with custom serializer', t => {
  const lines = [['level', 30], ['req', { url: '/foo' }], ['level', 30], ['res', { statusCode: 200 }]]
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    const check = lines.shift()
    const key = check[0]
    const value = check[1]

    t.deepEqual(line[key], value)
  })

  const logger = require('pino')({
    level: 'info',
    serializers: {
      req: function (req) {
        return {
          url: req.url
        }
      }
    }
  }, splitStream)

  const localFastify = Fastify({
    logger: logger
  })

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

test('The request id header key can be customized', t => {
  t.plan(9)
  const REQUEST_ID = '42'

  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: { stream: stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id'
  })
  t.tearDown(() => fastify.close())

  fastify.get('/', (req, reply) => {
    t.equal(req.raw.id, REQUEST_ID)
    req.log.info('some log message')
    reply.send({ id: req.raw.id })
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'my-custom-request-id': REQUEST_ID
    }
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, REQUEST_ID)

    stream.once('data', line => {
      t.equal(line.reqId, REQUEST_ID)
      t.equal(line.msg, 'incoming request', 'message is set')

      stream.once('data', line => {
        t.equal(line.reqId, REQUEST_ID)
        t.equal(line.msg, 'some log message', 'message is set')

        stream.once('data', line => {
          t.equal(line.reqId, REQUEST_ID)
          t.equal(line.msg, 'request completed', 'message is set')
        })
      })
    })
  })
})

test('The request id header key can be customized along with a custom id generator', t => {
  t.plan(12)
  const REQUEST_ID = '42'

  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: { stream: stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id',
    genReqId () {
      return 'foo'
    }
  })
  t.tearDown(() => fastify.close())

  fastify.get('/one', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    req.log.info('some log message')
    reply.send({ id: req.id })
  })

  fastify.get('/two', (req, reply) => {
    t.equal(req.id, 'foo')
    req.log.info('some log message 2')
    reply.send({ id: req.id })
  })

  const matches = [
    { reqId: REQUEST_ID, msg: /incoming request/ },
    { reqId: REQUEST_ID, msg: /some log message/ },
    { reqId: REQUEST_ID, msg: /request completed/ },
    { reqId: 'foo', msg: /incoming request/ },
    { reqId: 'foo', msg: /some log message 2/ },
    { reqId: 'foo', msg: /request completed/ }
  ]

  let i = 0
  stream.on('data', line => {
    t.match(line, matches[i])
    i += 1
  })

  fastify.inject({
    method: 'GET',
    url: '/one',
    headers: {
      'my-custom-request-id': REQUEST_ID
    }
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, REQUEST_ID)
  })

  fastify.inject({
    method: 'GET',
    url: '/two'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, 'foo')
  })
})

test('The request id log label can be changed', t => {
  t.plan(6)
  const REQUEST_ID = '42'

  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: { stream: stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id',
    requestIdLogLabel: 'traceId'
  })
  t.tearDown(() => fastify.close())

  fastify.get('/one', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    req.log.info('some log message')
    reply.send({ id: req.id })
  })

  const matches = [
    { traceId: REQUEST_ID, msg: /incoming request/ },
    { traceId: REQUEST_ID, msg: /some log message/ },
    { traceId: REQUEST_ID, msg: /request completed/ }
  ]

  let i = 0
  stream.on('data', line => {
    t.match(line, matches[i])
    i += 1
  })

  fastify.inject({
    method: 'GET',
    url: '/one',
    headers: {
      'my-custom-request-id': REQUEST_ID
    }
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.equal(payload.id, REQUEST_ID)
  })
})

test('The logger should accept custom serializer', t => {
  t.plan(9)

  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info',
      serializers: {
        req: function (req) {
          return {
            url: req.url
          }
        }
      }
    }
  })

  fastify.get('/custom', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('kaboom'))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port + '/custom')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')

      stream.once('data', line => {
        t.ok(line.req, 'req is defined')
        t.equal(line.msg, 'incoming request', 'message is set')
        t.deepEqual(line.req, { url: '/custom' }, 'custom req serialiser is use')

        stream.once('data', line => {
          t.ok(line.res, 'res is defined')
          t.equal(line.msg, 'kaboom', 'message is set')
          t.deepEqual(line.res, { statusCode: 500 }, 'default res serialiser is use')
        })
      })
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

    instance.setErrorHandler(function (e, request, reply) {
      reply.log.fatal('Hello')
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

  const expectedMessages = ['incoming request', 'Not Found', 'request completed']

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

test('should serialize request and response', t => {
  t.plan(3)
  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })
  const fastify = Fastify({ logger: { level: 'info', stream: dest } })

  fastify.get('/500', (req, reply) => {
    reply.code(500).send(Error('500 error'))
  })

  fastify.inject({
    url: '/500',
    method: 'GET'
  }, (e, res) => {
    const l = lines.find((line) => line.res && line.res.statusCode === 500)
    t.ok(l.req)
    t.is(l.req.method, 'GET')
    t.is(l.req.url, '/500')
  })
})

{
  const interfaces = os.networkInterfaces()
  const ipv6 = Object.keys(interfaces)
    .filter(name => name.substr(0, 2) === 'lo')
    .map(name => interfaces[name])
    .reduce((list, set) => list.concat(set), [])
    .filter(info => info.family === 'IPv6')
    .map(info => info.address)
    .shift()

  if (ipv6 !== undefined) {
    test('Wrap IPv6 address in listening log message', t => {
      t.plan(2)
      const stream = split(JSON.parse)
      const fastify = Fastify({
        logger: {
          stream: stream,
          level: 'info'
        }
      })
      fastify.listen(0, ipv6, err => {
        t.error(err)
        stream.once('data', line => {
          const expected = 'Server listening at http://[' + ipv6 + ']:' +
            fastify.server.address().port
          t.is(line.msg, expected)
          fastify.close()
        })
      })
    })
  }
}

test('Do not wrap IPv4 address', t => {
  t.plan(2)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.listen(0, '127.0.0.1', err => {
    t.error(err)
    stream.once('data', line => {
      const expected = 'Server listening at http://127.0.0.1:' +
        fastify.server.address().port
      t.is(line.msg, expected)
      fastify.close()
    })
  })
})

test('file option', t => {
  t.plan(13)
  var fastify = null
  var dest = file()

  fastify = Fastify({
    logger: {
      file: dest
    }
  })

  fastify.get('/', function (req, reply) {
    t.ok(req.log)
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port, () => {
      const stream = fs.createReadStream(dest).pipe(split(JSON.parse))

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
            t.ok(line.responseTime, 'responseTime is defined')
            stream.resume()
          })
        })
      })
    })
  })
})

test('should log the error if no error handler is defined', t => {
  t.plan(8)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('a generic error'))
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    http.get('http://localhost:' + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 50, 'level is correct')
          t.equal(line.msg, 'a generic error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.deepEqual(line.res, { statusCode: 500 }, 'status code is set')
          })
        })
      })
    })
  })
})

test('should log as info if error status code >= 400 and < 500 if no error handler is defined', t => {
  t.plan(8)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.get('/400', function (req, reply) {
    t.ok(req.log)
    reply.send(Object.assign(new Error('a 400 error'), { statusCode: 400 }))
  })
  fastify.get('/503', function (req, reply) {
    t.ok(req.log)
    reply.send(Object.assign(new Error('a 503 error'), { statusCode: 503 }))
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    http.get('http://localhost:' + fastify.server.address().port + '/400')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'a 400 error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.deepEqual(line.res, { statusCode: 400 }, 'status code is set')
          })
        })
      })
    })
  })
})

test('should log as error if error status code >= 500 if no error handler is defined', t => {
  t.plan(8)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.get('/503', function (req, reply) {
    t.ok(req.log)
    reply.send(Object.assign(new Error('a 503 error'), { statusCode: 503 }))
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    http.get('http://localhost:' + fastify.server.address().port + '/503')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 50, 'level is correct')
          t.equal(line.msg, 'a 503 error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.deepEqual(line.res, { statusCode: 503 }, 'status code is set')
          })
        })
      })
    })
  })
})

test('should not log the error if error handler is defined', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('something happened'))
  })
  fastify.setErrorHandler((err, req, reply) => {
    reply.send(err)
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    http.get('http://localhost:' + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'request completed', 'message is set')
          t.deepEqual(line.res, { statusCode: 500 }, 'status code is set')
        })
      })
    })
  })
})

test('should not rely on raw request to log errors', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    modifyCoreObjects: false,
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.status(415).send(new Error('something happened'))
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    http.get('http://localhost:' + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'something happened', 'message is set')
          t.deepEqual(line.res, { statusCode: 415 }, 'status code is set')
        })
      })
    })
  })
})

test('should redact the authorization header if so specified', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream: stream,
      redact: ['req.headers.authorization'],
      level: 'info',
      serializers: {
        req (req) {
          return {
            method: req.method,
            url: req.url,
            headers: req.headers,
            hostname: req.hostname,
            remoteAddress: req.ip,
            remotePort: req.connection.remotePort
          }
        }
      }
    }
  })
  fastify.get('/', function (req, reply) {
    t.is(req.headers.authorization, 'Bearer abcde')
    reply.send({ hello: 'world' })
  })
  stream.once('data', listenAtLogLine => {
    t.ok(listenAtLogLine, 'listen at log message is ok')
    stream.once('data', line => {
      t.equal(line.req.headers.authorization, '[Redacted]', 'authorization is redacted')
    })
  })
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: {
        authorization: 'Bearer abcde'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body.toString(), JSON.stringify({ hello: 'world' }))
    })
  })
})

test('should not log incoming request and outgoing response when disabled', t => {
  t.plan(3)
  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })
  const fastify = Fastify({ disableRequestLogging: true, logger: { level: 'info', stream: dest } })

  fastify.get('/500', (req, reply) => {
    reply.code(500).send(Error('500 error'))
  })

  fastify.inject({
    url: '/500',
    method: 'GET'
  }, (e, res) => {
    t.is(lines.length, 1)
    t.ok(lines[0].msg)
    t.is(lines[0].msg, '500 error')
  })
})
