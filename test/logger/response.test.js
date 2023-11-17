'use strict'

const stream = require('node:stream')

const t = require('tap')
const split = require('split2')
const pino = require('pino')

const Fastify = require('../../fastify')
const { on } = stream

t.test('response serialization', (t) => {
  t.setTimeout(60000)

  t.plan(4)

  t.test('Should use serializers from plugin and route', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({ level: 'info' }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should use serializers from instance fastify and route', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({
      level: 'info',
      serializers: {
        test: value => 'X' + value,
        test2: value => 'This should be override - ' + value
      }
    }, stream)
    const fastify = Fastify({
      logger
    })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/', {
      logSerializers: {
        test2: value => 'Z' + value
      }
    }, (req, reply) => {
      req.log.info({ test: 'Hello', test2: 'Hello' }) // { test: 'XHello', test2: 'ZHello' }
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('Should use serializers inherit from contexts', async (t) => {
    const lines = [
      { msg: 'incoming request' },
      { test: 'XHello', test2: 'YHello', test3: 'ZHello' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)

    const logger = pino({
      level: 'info',
      serializers: {
        test: value => 'X' + value
      }
    }, stream)

    const fastify = Fastify({ logger })
    t.teardown(fastify.close.bind(fastify))

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

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/' })
      const body = await response.json()
      t.same(body, { hello: 'world' })
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })

  t.test('should serialize request and response', async (t) => {
    const lines = [
      { req: { method: 'GET', url: '/500' }, msg: 'incoming request' },
      { req: { method: 'GET', url: '/500' }, msg: '500 error' },
      { msg: 'request completed' }
    ]
    t.plan(lines.length + 1)

    const stream = split(JSON.parse)
    const fastify = Fastify({ logger: { level: 'info', stream } })
    t.teardown(fastify.close.bind(fastify))

    fastify.get('/500', (req, reply) => {
      reply.code(500).send(Error('500 error'))
    })

    await fastify.ready()

    {
      const response = await fastify.inject({ method: 'GET', url: '/500' })
      t.equal(response.statusCode, 500)
    }

    for await (const [line] of on(stream, 'data')) {
      t.match(line, lines.shift())
      if (lines.length === 0) break
    }
  })
})
