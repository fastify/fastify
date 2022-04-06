'use strict'

const { test, teardown, before } = require('tap')
const helper = require('./helper')
const http = require('http')
const stream = require('stream')
const split = require('split2')
const Fastify = require('..')
const pino = require('pino')
const path = require('path')
const os = require('os')
const fs = require('fs')
const sget = require('simple-get').concat
const dns = require('dns')

const files = []
let count = 0
let localhost
let localhostForURL

function file () {
  const file = path.join(os.tmpdir(), `sonic-boom-${process.pid}-${process.hrtime().toString()}-${count++}`)
  files.push(file)
  return file
}

before(async function () {
  [localhost, localhostForURL] = await helper.getLoopbackHost()
})

teardown(() => {
  files.forEach((file) => {
    try {
      fs.unlinkSync(file)
    } catch (e) {
      console.log(e)
    }
  })
})

test('defaults to info level', t => {
  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream
      }
    })
  } catch (e) {
    t.fail()
  }

  fastify.get('/', function (req, reply) {
    t.ok(req.log)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    dns.lookup('localhost', { all: true }, function (err, addresses) {
      t.error(err)
      let toSkip = addresses.length

      function skip (data) {
        if (--toSkip === 0) {
          stream.removeListener('data', skip)
          check()
        }
      }

      stream.on('data', skip)

      http.get(`http://${localhostForURL}:` + fastify.server.address().port)
    })
  })

  function check () {
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
        t.end()
      })
    })
  }
})

test('test log stream', t => {
  t.plan(12)
  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream,
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

  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port)
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
  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream,
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

  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/error')
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

  const localFastify = Fastify({ logger })

  localFastify.get('/foo', function (req, reply) {
    t.ok(req.log)
    req.log.info('log success')
    reply.send({ hello: 'world' })
  })

  localFastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    http.get(`http://${localhostForURL}:` + localFastify.server.address().port + '/foo', (res) => {
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

    t.same(line[key], value)
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
    logger
  })

  localFastify.get('/foo', function (req, reply) {
    t.ok(req.log)
    req.log.info('log success')
    reply.send({ hello: 'world' })
  })

  localFastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    http.get(`http://${localhostForURL}:` + localFastify.server.address().port + '/foo', (res) => {
      res.resume()
      res.on('end', () => {
        localFastify.server.close()
      })
    })
  })
})

test('expose the logger', t => {
  t.plan(2)
  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.ok(fastify.log)
  t.same(typeof fastify.log, 'object')
})

test('The request id header key can be customized', t => {
  t.plan(9)
  const REQUEST_ID = '42'

  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: { stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id'
  })
  t.teardown(() => fastify.close())

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    req.log.info('some log message')
    reply.send({ id: req.id })
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
    logger: { stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id',
    genReqId (req) {
      return 'foo'
    }
  })
  t.teardown(() => fastify.close())

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
    logger: { stream, level: 'info' },
    requestIdHeader: 'my-custom-request-id',
    requestIdLogLabel: 'traceId'
  })
  t.teardown(() => fastify.close())

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
      stream,
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

  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/custom')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')

      stream.once('data', line => {
        t.ok(line.req, 'req is defined')
        t.equal(line.msg, 'incoming request', 'message is set')
        t.same(line.req, { url: '/custom' }, 'custom req serializer is use')

        stream.once('data', line => {
          t.ok(line.res, 'res is defined')
          t.equal(line.msg, 'kaboom', 'message is set')
          t.same(line.res, { statusCode: 500 }, 'default res serializer is use')
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
    t.same(line.msg, lines.shift())
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
    t.same(payload, { hello: 'world' })
  })
})

test('logger can be silented', t => {
  t.plan(17)
  const fastify = Fastify({
    logger: false
  })
  t.ok(fastify.log)
  t.same(typeof fastify.log, 'object')
  t.same(typeof fastify.log.fatal, 'function')
  t.same(typeof fastify.log.error, 'function')
  t.same(typeof fastify.log.warn, 'function')
  t.same(typeof fastify.log.info, 'function')
  t.same(typeof fastify.log.debug, 'function')
  t.same(typeof fastify.log.trace, 'function')
  t.same(typeof fastify.log.child, 'function')

  const childLog = fastify.log.child()

  t.same(typeof childLog, 'object')
  t.same(typeof childLog.fatal, 'function')
  t.same(typeof childLog.error, 'function')
  t.same(typeof childLog.warn, 'function')
  t.same(typeof childLog.info, 'function')
  t.same(typeof childLog.debug, 'function')
  t.same(typeof childLog.trace, 'function')
  t.same(typeof childLog.child, 'function')
})

test('Should set a custom logLevel for a plugin', t => {
  const lines = ['incoming request', 'Hello', 'request completed']
  t.plan(7)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, lines.shift())
  })

  const logger = pino({ level: 'error' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', (req, reply) => {
    req.log.info('Hello') // we should not see this log
    reply.send({ hello: 'world' })
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/plugin', (req, reply) => {
      req.log.info('Hello') // we should see this log
      reply.send({ hello: 'world' })
    })
    done()
  }, { logLevel: 'info' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/plugin'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should set a custom logSerializers for a plugin', t => {
  t.plan(3)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, 'XHello')
    }
  })

  const logger = pino({ level: 'error' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/plugin', (req, reply) => {
      req.log.info({ test: 'Hello' }) // we should see this log
      reply.send({ hello: 'world' })
    })
    done()
  }, { logLevel: 'info', logSerializers: { test: value => 'X' + value } })

  fastify.inject({
    method: 'GET',
    url: '/plugin'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
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

  fastify.register(function (instance, opts, done) {
    instance.get('/info', (req, reply) => {
      req.log.info('info') // we should see this log
      req.log.debug('hidden log')
      reply.send({ hello: 'world' })
    })
    done()
  }, { logLevel: 'info' })

  fastify.register(function (instance, opts, done) {
    instance.get('/debug', (req, reply) => {
      req.log.debug('debug') // we should see this log
      req.log.trace('hidden log')
      reply.send({ hello: 'world' })
    })
    done()
  }, { logLevel: 'debug' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/info'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/debug'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should set a custom logSerializers for every plugin', async t => {
  const lines = ['Hello', 'XHello', 'ZHello']
  t.plan(6)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, lines.shift())
    }
  })

  const logger = pino({ level: 'info' }, splitStream)
  const fastify = Fastify({
    logger
  })

  fastify.get('/', (req, reply) => {
    req.log.warn({ test: 'Hello' })
    reply.send({ hello: 'world' })
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/test1', (req, reply) => {
      req.log.info({ test: 'Hello' })
      reply.send({ hello: 'world' })
    })
    done()
  }, { logSerializers: { test: value => 'X' + value } })

  fastify.register(function (instance, opts, done) {
    instance.get('/test2', (req, reply) => {
      req.log.info({ test: 'Hello' })
      reply.send({ hello: 'world' })
    })
    done()
  }, { logSerializers: { test: value => 'Z' + value } })

  let res = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  t.same(res.json(), { hello: 'world' })

  res = await fastify.inject({
    method: 'GET',
    url: '/test1'
  })
  t.same(res.json(), { hello: 'world' })

  res = await fastify.inject({
    method: 'GET',
    url: '/test2'
  })
  t.same(res.json(), { hello: 'world' })
})

test('Should override serializers from route', t => {
  t.plan(3)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, 'ZHello')
    }
  })

  const logger = pino({ level: 'info' }, splitStream)
  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/', {
      logSerializers: {
        test: value => 'Z' + value // should override
      }
    }, (req, reply) => {
      req.log.info({ test: 'Hello' })
      reply.send({ hello: 'world' })
    })
    done()
  }, { logSerializers: { test: value => 'X' + value } })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should override serializers from plugin', t => {
  t.plan(3)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, 'ZHello')
    }
  })

  const logger = pino({ level: 'info' }, splitStream)
  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.register(context1, {
      logSerializers: {
        test: value => 'Z' + value // should override
      }
    })
    done()
  }, { logSerializers: { test: value => 'X' + value } })

  function context1 (instance, opts, done) {
    instance.get('/', (req, reply) => {
      req.log.info({ test: 'Hello' })
      reply.send({ hello: 'world' })
    })
    done()
  }

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should use serializers from plugin and route', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, 'XHello')
    }
    if (line.test2) {
      t.same(line.test2, 'ZHello')
    }
  })

  const logger = pino({ level: 'info' }, splitStream)
  const fastify = Fastify({
    logger
  })

  fastify.register(context1, {
    logSerializers: { test: value => 'X' + value }
  })

  function context1 (instance, opts, done) {
    instance.get('/', {
      logSerializers: {
        test2: value => 'Z' + value
      }
    }, (req, reply) => {
      req.log.info({ test: 'Hello', test2: 'Hello' }) // { test: 'XHello', test2: 'ZHello' }
      reply.send({ hello: 'world' })
    })
    done()
  }

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should use serializers from instance fastify and route', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test) {
      t.same(line.test, 'XHello')
    }
    if (line.test2) {
      t.same(line.test2, 'ZHello')
    }
  })

  const logger = pino({
    level: 'info',
    serializers: {
      test: value => 'X' + value,
      test2: value => 'This should be override - ' + value
    }
  }, splitStream)
  const fastify = Fastify({
    logger
  })

  fastify.get('/', {
    logSerializers: {
      test2: value => 'Z' + value
    }
  }, (req, reply) => {
    req.log.info({ test: 'Hello', test2: 'Hello' }) // { test: 'XHello', test2: 'ZHello' }
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should use serializers inherit from contexts', t => {
  t.plan(5)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    if (line.test && line.test2 && line.test3) {
      t.same(line.test, 'XHello')
      t.same(line.test2, 'YHello')
      t.same(line.test3, 'ZHello')
    }
  })

  const logger = pino({
    level: 'info',
    serializers: {
      test: value => 'X' + value
    }
  }, splitStream)

  const fastify = Fastify({ logger })
  fastify.register(context1, { logSerializers: { test2: value => 'Y' + value } })

  function context1 (instance, opts, done) {
    instance.get('/', {
      logSerializers: {
        test3: value => 'Z' + value
      }
    }, (req, reply) => {
      req.log.info({ test: 'Hello', test2: 'Hello', test3: 'Hello' }) // { test: 'XHello', test2: 'YHello', test3: 'ZHello' }
      reply.send({ hello: 'world' })
    })
    done()
  }

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should increase the log level for a specific plugin', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, 'Hello')
    t.ok(line.level === 50)
  })

  const logger = pino({ level: 'info' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/', (req, reply) => {
      req.log.error('Hello') // we should see this log
      reply.send({ hello: 'world' })
    })
    done()
  }, { logLevel: 'error' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should set the log level for the customized 404 handler', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, 'Hello')
    t.ok(line.level === 50)
  })

  const logger = pino({ level: 'warn' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.setNotFoundHandler(function (req, reply) {
      req.log.error('Hello')
      reply.code(404).send()
    })
    done()
  }, { logLevel: 'error' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should set the log level for the customized 500 handler', t => {
  t.plan(4)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, 'Hello')
    t.ok(line.level === 60)
  })

  const logger = pino({ level: 'warn' }, splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/', (req, reply) => {
      req.log.error('kaboom')
      reply.send(new Error('kaboom'))
    })

    instance.setErrorHandler(function (e, request, reply) {
      reply.log.fatal('Hello')
      reply.code(500).send()
    })
    done()
  }, { logLevel: 'fatal' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
  })
})

test('Should set a custom log level for a specific route', t => {
  const lines = ['incoming request', 'Hello', 'request completed']
  t.plan(7)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, lines.shift())
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
    t.same(payload, { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/no-log'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('The default 404 handler logs the incoming request', t => {
  t.plan(5)

  const expectedMessages = [
    'incoming request',
    'Route GET:/not-found not found',
    'request completed'
  ]

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.same(line.msg, expectedMessages.shift())
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
    t.equal(res.statusCode, 404)
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
    t.same(l.req.method, 'GET')
    t.same(l.req.url, '/500')
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
          stream,
          level: 'info'
        }
      })
      fastify.listen({ port: 0, host: ipv6 }, err => {
        t.error(err)
        stream.once('data', line => {
          const expected = 'Server listening at http://[' + ipv6 + ']:' +
            fastify.server.address().port
          t.same(line.msg, expected)
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
      stream,
      level: 'info'
    }
  })
  fastify.listen({ port: 0, host: '127.0.0.1' }, err => {
    t.error(err)
    stream.once('data', line => {
      const expected = 'Server listening at http://127.0.0.1:' +
        fastify.server.address().port
      t.same(line.msg, expected)
      fastify.close()
    })
  })
})

test('file option', t => {
  t.plan(13)
  let fastify = null
  const dest = file()

  fastify = Fastify({
    logger: {
      file: dest
    }
  })

  fastify.get('/', function (req, reply) {
    t.ok(req.log)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port, () => {
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
      stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('a generic error'))
  })
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 50, 'level is correct')
          t.equal(line.msg, 'a generic error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.same(line.res, { statusCode: 500 }, 'status code is set')
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
      stream,
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
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/400')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'a 400 error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.same(line.res, { statusCode: 400 }, 'status code is set')
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
      stream,
      level: 'info'
    }
  })
  fastify.get('/503', function (req, reply) {
    t.ok(req.log)
    reply.send(Object.assign(new Error('a 503 error'), { statusCode: 503 }))
  })
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/503')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 50, 'level is correct')
          t.equal(line.msg, 'a 503 error', 'message is set')
          stream.once('data', line => {
            t.equal(line.msg, 'request completed', 'message is set')
            t.same(line.res, { statusCode: 503 }, 'status code is set')
          })
        })
      })
    })
  })
})

test('should not log the error if error handler is defined and it does not error', t => {
  t.plan(8)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.send(new Error('something happened'))
  })
  fastify.setErrorHandler((err, req, reply) => {
    t.ok(err)
    reply.send('something bad happened')
  })
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'request completed', 'message is set')
          t.same(line.res, { statusCode: 200 }, 'status code is set')
        })
      })
    })
  })
})

test('should not rely on raw request to log errors', t => {
  t.plan(7)
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream,
      level: 'info'
    }
  })
  fastify.get('/error', function (req, reply) {
    t.ok(req.log)
    reply.status(415).send(new Error('something happened'))
  })
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    http.get(`http://${localhostForURL}:` + fastify.server.address().port + '/error')
    stream.once('data', listenAtLogLine => {
      t.ok(listenAtLogLine, 'listen at log message is ok')
      stream.once('data', line => {
        t.equal(line.msg, 'incoming request', 'message is set')
        stream.once('data', line => {
          t.equal(line.level, 30, 'level is correct')
          t.equal(line.msg, 'something happened', 'message is set')
          t.same(line.res, { statusCode: 415 }, 'status code is set')
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
      stream,
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
            remotePort: req.socket.remotePort
          }
        }
      }
    }
  })
  fastify.get('/', function (req, reply) {
    t.same(req.headers.authorization, 'Bearer abcde')
    reply.send({ hello: 'world' })
  })
  stream.once('data', listenAtLogLine => {
    t.ok(listenAtLogLine, 'listen at log message is ok')
    stream.once('data', line => {
      t.equal(line.req.headers.authorization, '[Redacted]', 'authorization is redacted')
    })
  })
  fastify.listen({ port: 0, host: localhost }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: `http://${localhostForURL}:` + fastify.server.address().port,
      headers: {
        authorization: 'Bearer abcde'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
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
    t.same(lines.length, 1)
    t.ok(lines[0].msg)
    t.same(lines[0].msg, '500 error')
  })
})

test('should not log incoming request and outgoing response for 404 onBadUrl when disabled', t => {
  t.plan(1)
  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })
  const fastify = Fastify({ disableRequestLogging: true, logger: { level: 'info', stream: dest } })

  fastify.inject({
    url: '/%c0',
    method: 'GET'
  }, (e, res) => {
    // it will log 1 line only because of basic404
    t.same(lines.length, 1)
  })
})

test('should pass when using unWritable props in the logger option', t => {
  t.plan(1)
  Fastify({
    logger: Object.defineProperty({}, 'level', { value: 'info' })
  })
  t.pass()
})

test('should be able to use a custom logger', t => {
  t.plan(1)

  const logger = {
    fatal: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    child: () => {}
  }

  Fastify({ logger })

  t.pass()
})

test('should create a default logger if provided one is invalid', t => {
  t.plan(1)

  const logger = new Date()

  Fastify({ logger })

  t.pass()
})

test('should not throw error when serializing custom req', t => {
  t.plan(1)

  const lines = []
  const dest = new stream.Writable({
    write: function (chunk, enc, cb) {
      lines.push(JSON.parse(chunk))
      cb()
    }
  })
  const fastify = Fastify({ logger: { level: 'info', stream: dest } })
  fastify.log.info({ req: {} })

  t.same(lines[0].req, {})
})
