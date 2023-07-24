'use strict'

const http = require('http')
const stream = require('stream')

const t = require('tap')
const split = require('split2')
const pino = require('pino')

const Fastify = require('../../fastify')
const helper = require('../helper')
const { FST_ERR_LOG_INVALID_LOGGER } = require('../../lib/errors')
const { on } = stream

function createDeferredPromise () {
  const promise = {}
  promise.promise = new Promise(function (resolve) {
    promise.resolve = resolve
  })
  return promise
}

function request (url, cleanup = () => { }) {
  const promise = createDeferredPromise()
  http.get(url, (res) => {
    const chunks = []
    // we consume the response
    res.on('data', function (chunk) {
      chunks.push(chunk)
    })
    res.once('end', function () {
      cleanup(res, Buffer.concat(chunks).toString())
      promise.resolve()
    })
  })
  return promise.promise
}

t.test('test log stream', (t) => {
  t.setTimeout(60000)

  let localhost
  let localhostForURL

  t.plan(22)

  t.before(async function () {
    [localhost, localhostForURL] = await helper.getLoopbackHost()
  })

  t.test('defaults to info level', async (t) => {
    const lines = [
      { reqId: /req-/, req: { method: 'GET' }, msg: 'incoming request' },
      { reqId: /req-/, res: { statusCode: 200 }, msg: 'request completed' }
    ]
    t.plan(lines.length * 2 + 1)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', function (req, reply) {
      t.ok(req.log)
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0 })

    await request(`http://${localhostForURL}:` + fastify.server.address().port)

    let id
    for await (const [line] of on(stream, 'data')) {
      // we skip the non-request log
      if (typeof line.reqId !== 'string') continue
      if (id === undefined && line.reqId) id = line.reqId
      if (id !== undefined && line.reqId) t.equal(line.reqId, id)
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('test log stream', async (t) => {
    const lines = [
      { msg: /^Server listening at / },
      { reqId: /req-/, req: { method: 'GET' }, msg: 'incoming request' },
      { reqId: /req-/, res: { statusCode: 200 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 3)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', function (req, reply) {
      t.ok(req.log)
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port)

    let id
    for await (const [line] of on(stream, 'data')) {
      if (id === undefined && line.reqId) id = line.reqId
      if (id !== undefined && line.reqId) t.equal(line.reqId, id)
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('test error log stream', async (t) => {
    const lines = [
      { msg: /^Server listening at / },
      { reqId: /req-/, req: { method: 'GET' }, msg: 'incoming request' },
      { reqId: /req-/, res: { statusCode: 500 }, msg: 'kaboom' },
      { reqId: /req-/, res: { statusCode: 500 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 4)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/error', function (req, reply) {
      t.ok(req.log)
      reply.send(new Error('kaboom'))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/error')

    let id
    for await (const [line] of on(stream, 'data')) {
      if (id === undefined && line.reqId) id = line.reqId
      if (id !== undefined && line.reqId) t.equal(line.reqId, id)
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('can use external logger instance', async (t) => {
    const lines = [/^Server listening at /, /^incoming request$/, /^log success$/, /^request completed$/]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = require('pino')(stream)

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/foo', function (req, reply) {
      t.ok(req.log)
      req.log.info('log success')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/foo')

    for await (const [line] of on(stream, 'data')) {
      const regex = lines.shift()
      t.ok(regex.test(line.msg), '"' + line.msg + '" dont match "' + regex + '"')
      if (lines.length === 0) break
    }
  })

  t.test('can use external logger instance with custom serializer', async (t) => {
    const lines = [['level', 30], ['req', { url: '/foo' }], ['level', 30], ['res', { statusCode: 200 }]]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const logger = require('pino')({
      level: 'info',
      serializers: {
        req: function (req) {
          return {
            url: req.url
          }
        }
      }
    }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/foo', function (req, reply) {
      t.ok(req.log)
      req.log.info('log success')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/foo')

    for await (const [line] of on(stream, 'data')) {
      const check = lines.shift()
      const key = check[0]
      const value = check[1]
      t.same(line[key], value)
      if (lines.length === 0) break
    }
  })

  t.test('should throw in case the external logger provided does not have a child method', async (t) => {
    t.plan(1)
    const loggerInstance = {
      info: console.info,
      error: console.error,
      debug: console.debug,
      fatal: console.error,
      warn: console.warn,
      trace: console.trace
    }

    try {
      const fastify = Fastify({ logger: loggerInstance })
      await fastify.ready()
    } catch (err) {
      t.equal(
        err instanceof FST_ERR_LOG_INVALID_LOGGER,
        true,
        "Invalid logger object provided. The logger instance should have these functions(s): 'child'."
      )
    }
  })

  t.test('should throw in case a partially matching logger is provided', async (t) => {
    t.plan(1)

    try {
      const fastify = Fastify({ logger: console })
      await fastify.ready()
    } catch (err) {
      t.equal(
        err instanceof FST_ERR_LOG_INVALID_LOGGER,
        true,
        "Invalid logger object provided. The logger instance should have these functions(s): 'fatal,child'."
      )
    }
  })

  t.test('expose the logger', async (t) => {
    t.plan(2)
    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream,
        level: 'info'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    await fastify.ready()

    t.ok(fastify.log)
    t.same(typeof fastify.log, 'object')
  })

  t.test('The request id header key can be customized', async (t) => {
    const lines = ['incoming request', 'some log message', 'request completed']
    t.plan(lines.length * 2 + 2)
    const REQUEST_ID = '42'

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: { stream, level: 'info' },
      requestIdHeader: 'my-custom-request-id'
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', (req, reply) => {
      t.equal(req.id, REQUEST_ID)
      req.log.info('some log message')
      reply.send({ id: req.id })
    })

    const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'my-custom-request-id': REQUEST_ID } })
    const body = await response.json()
    t.equal(body.id, REQUEST_ID)

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.reqId, REQUEST_ID)
      t.equal(line.msg, lines.shift(), 'message is set')
      if (lines.length === 0) break
    }
  })

  t.test('The request id header key can be ignored', async (t) => {
    const lines = ['incoming request', 'some log message', 'request completed']
    t.plan(lines.length * 2 + 2)
    const REQUEST_ID = 'ignore-me'

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: { stream, level: 'info' },
      requestIdHeader: false
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', (req, reply) => {
      t.equal(req.id, 'req-1')
      req.log.info('some log message')
      reply.send({ id: req.id })
    })
    const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'request-id': REQUEST_ID } })
    const body = await response.json()
    t.equal(body.id, 'req-1')

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.reqId, 'req-1')
      t.equal(line.msg, lines.shift(), 'message is set')
      if (lines.length === 0) break
    }
  })

  t.test('The request id header key can be customized along with a custom id generator', async (t) => {
    const REQUEST_ID = '42'
    const matches = [
      { reqId: REQUEST_ID, msg: /incoming request/ },
      { reqId: REQUEST_ID, msg: /some log message/ },
      { reqId: REQUEST_ID, msg: /request completed/ },
      { reqId: 'foo', msg: /incoming request/ },
      { reqId: 'foo', msg: /some log message 2/ },
      { reqId: 'foo', msg: /request completed/ }
    ]
    t.plan(matches.length + 4)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: { stream, level: 'info' },
      requestIdHeader: 'my-custom-request-id',
      genReqId (req) {
        return 'foo'
      }
    })
    t.teardown(fastify.close.bind(fastify))

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

    {
      const response = await fastify.inject({ method: 'GET', url: '/one', headers: { 'my-custom-request-id': REQUEST_ID } })
      const body = await response.json()
      t.equal(body.id, REQUEST_ID)
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/two' })
      const body = await response.json()
      t.equal(body.id, 'foo')
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, matches.shift())
      if (matches.length === 0) break
    }
  })

  t.test('The request id header key can be ignored along with a custom id generator', async (t) => {
    const REQUEST_ID = 'ignore-me'
    const matches = [
      { reqId: 'foo', msg: /incoming request/ },
      { reqId: 'foo', msg: /some log message/ },
      { reqId: 'foo', msg: /request completed/ },
      { reqId: 'foo', msg: /incoming request/ },
      { reqId: 'foo', msg: /some log message 2/ },
      { reqId: 'foo', msg: /request completed/ }
    ]
    t.plan(matches.length + 4)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: { stream, level: 'info' },
      requestIdHeader: false,
      genReqId (req) {
        return 'foo'
      }
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/one', (req, reply) => {
      t.equal(req.id, 'foo')
      req.log.info('some log message')
      reply.send({ id: req.id })
    })

    fastify.get('/two', (req, reply) => {
      t.equal(req.id, 'foo')
      req.log.info('some log message 2')
      reply.send({ id: req.id })
    })

    {
      const response = await fastify.inject({ method: 'GET', url: '/one', headers: { 'request-id': REQUEST_ID } })
      const body = await response.json()
      t.equal(body.id, 'foo')
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/two' })
      const body = await response.json()
      t.equal(body.id, 'foo')
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, matches.shift())
      if (matches.length === 0) break
    }
  })

  t.test('The request id log label can be changed', async (t) => {
    const REQUEST_ID = '42'
    const matches = [
      { traceId: REQUEST_ID, msg: /incoming request/ },
      { traceId: REQUEST_ID, msg: /some log message/ },
      { traceId: REQUEST_ID, msg: /request completed/ }
    ]
    t.plan(matches.length + 2)

    const stream = split(JSON.parse)
    const fastify = Fastify({
      logger: { stream, level: 'info' },
      requestIdHeader: 'my-custom-request-id',
      requestIdLogLabel: 'traceId'
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/one', (req, reply) => {
      t.equal(req.id, REQUEST_ID)
      req.log.info('some log message')
      reply.send({ id: req.id })
    })

    {
      const response = await fastify.inject({ method: 'GET', url: '/one', headers: { 'my-custom-request-id': REQUEST_ID } })
      const body = await response.json()
      t.equal(body.id, REQUEST_ID)
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, matches.shift())
      if (matches.length === 0) break
    }
  })

  t.test('The logger should accept custom serializer', async (t) => {
    const lines = [
      { msg: /^Server listening at / },
      { req: { url: '/custom' }, msg: 'incoming request' },
      { res: { statusCode: 500 }, msg: 'kaboom' },
      { res: { statusCode: 500 }, msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

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
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/custom', function (req, reply) {
      t.ok(req.log)
      reply.send(new Error('kaboom'))
    })

    await fastify.ready()
    await fastify.listen({ port: 0, host: localhost })

    await request(`http://${localhostForURL}:` + fastify.server.address().port + '/custom')

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('reply.send logs an error if called twice in a row', async (t) => {
    const lines = [
      'incoming request',
      'request completed',
      'Reply was already sent, did you forget to "return reply" in "/" (GET)?',
      'Reply was already sent, did you forget to "return reply" in "/" (GET)?'
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const logger = pino(stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
      reply.send({ hello: 'world2' })
      reply.send({ hello: 'world3' })
    })

    const response = await fastify.inject({ method: 'GET', url: '/' })
    const body = await response.json()
    t.same(body, { hello: 'world' })

    for await (const [line] of on(stream, 'data')) {
      t.same(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('logger can be silented', (t) => {
    t.plan(17)
    const fastify = Fastify({
      logger: false
    })
    t.teardown(fastify.close.bind(fastify))
    t.ok(fastify.log)
    t.equal(typeof fastify.log, 'object')
    t.equal(typeof fastify.log.fatal, 'function')
    t.equal(typeof fastify.log.error, 'function')
    t.equal(typeof fastify.log.warn, 'function')
    t.equal(typeof fastify.log.info, 'function')
    t.equal(typeof fastify.log.debug, 'function')
    t.equal(typeof fastify.log.trace, 'function')
    t.equal(typeof fastify.log.child, 'function')

    const childLog = fastify.log.child()

    t.equal(typeof childLog, 'object')
    t.equal(typeof childLog.fatal, 'function')
    t.equal(typeof childLog.error, 'function')
    t.equal(typeof childLog.warn, 'function')
    t.equal(typeof childLog.info, 'function')
    t.equal(typeof childLog.debug, 'function')
    t.equal(typeof childLog.trace, 'function')
    t.equal(typeof childLog.child, 'function')
  })

  t.test('Should set a custom logLevel for a plugin', async (t) => {
    const lines = ['incoming request', 'Hello', 'request completed']
    t.plan(lines.length + 2)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'error' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', (req, reply) => {
      req.log.info('Not Exist') // we should not see this log
      reply.send({ hello: 'world' })
    })

    fastify.register(function (instance, opts, done) {
      instance.get('/plugin', (req, reply) => {
        req.log.info('Hello') // we should see this log
        reply.send({ hello: 'world' })
      })
      done()
    }, { logLevel: 'info' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/plugin' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.same(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set a custom logSerializers for a plugin', async (t) => {
    const lines = ['incoming request', 'XHello', 'request completed']
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'error' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.get('/plugin', (req, reply) => {
        req.log.info({ test: 'Hello' }) // we should see this log
        reply.send({ hello: 'world' })
      })
      done()
    }, { logLevel: 'info', logSerializers: { test: value => 'X' + value } })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/plugin' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      // either test or msg
      t.equal(line.test || line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set a custom logLevel for every plugin', async (t) => {
    const lines = ['incoming request', 'info', 'request completed', 'incoming request', 'debug', 'request completed']
    t.plan(lines.length * 2 + 3)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'error' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/info' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/debug' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.ok(line.level === 30 || line.level === 20)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set a custom logSerializers for every plugin', async (t) => {
    const lines = ['incoming request', 'Hello', 'request completed', 'incoming request', 'XHello', 'request completed', 'incoming request', 'ZHello', 'request completed']
    t.plan(lines.length + 3)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/test1' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/test2' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.test || line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should override serializers from route', async (t) => {
    const lines = ['incoming request', 'ZHello', 'request completed']
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.test || line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should override serializers from plugin', async (t) => {
    const lines = ['incoming request', 'ZHello', 'request completed']
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.test || line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })
})
