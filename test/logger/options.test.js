'use strict'

const stream = require('node:stream')

const t = require('tap')
const split = require('split2')
const pino = require('pino')

const Fastify = require('../../fastify')
const { on } = stream

t.test('logger options', (t) => {
  t.setTimeout(60000)

  t.plan(12)

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

  t.test('Should increase the log level for a specific plugin', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.get('/', (req, reply) => {
        req.log.error('Hello') // we should see this log
        reply.send({ hello: 'world' })
      })
      done()
    }, { logLevel: 'error' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 50)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set the log level for the customized 404 handler', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'warn' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.register(function (instance, opts, done) {
      instance.setNotFoundHandler(function (req, reply) {
        req.log.error('Hello')
        reply.code(404).send()
      })
      done()
    }, { logLevel: 'error' })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      t.equal(response.statusCode, 404)
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 50)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set the log level for the customized 500 handler', async (t) => {
    const lines = ['Hello']
    t.plan(lines.length * 2 + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'warn' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      t.equal(response.statusCode, 500)
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.level, 60)
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should set a custom log level for a specific route', async (t) => {
    const lines = ['incoming request', 'Hello', 'request completed']
    t.plan(lines.length + 2)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'error' }, stream)

    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/log', { logLevel: 'info' }, (req, reply) => {
      req.log.info('Hello')
      reply.send({ hello: 'world' })
    })

    fastify.get('/no-log', (req, reply) => {
      req.log.info('Hello')
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/log' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    {
      const response = await fastify.inject({ method: 'GET', url: '/no-log' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.equal(line.msg, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should pass when using unWritable props in the logger option', (t) => {
    t.plan(8)
    const fastify = Fastify({
      logger: Object.defineProperty({}, 'level', { value: 'info' })
    })
    t.teardown(fastify.close.bind(fastify))

    t.equal(typeof fastify.log, 'object')
    t.equal(typeof fastify.log.fatal, 'function')
    t.equal(typeof fastify.log.error, 'function')
    t.equal(typeof fastify.log.warn, 'function')
    t.equal(typeof fastify.log.info, 'function')
    t.equal(typeof fastify.log.debug, 'function')
    t.equal(typeof fastify.log.trace, 'function')
    t.equal(typeof fastify.log.child, 'function')
  })
})
