'use strict'

const stream = require('node:stream')
const t = require('node:test')
const split = require('split2')
const pino = require('pino')
const { once, on } = stream

const Fastify = require('../../fastify')

t.test('custom logger plugin', { timeout: 60000 }, async (t) => {
  await t.test('plugin hook runs for normal requests', async (t) => {
    t.plan(2)

    const stream = split(JSON.parse)
    const loggerInstance = pino({ level: 'info' }, stream)

    const fastify = Fastify({
      loggerInstance,
      disableRequestLogging: false
    })
    t.after(() => fastify.close())

    // Register custom logger plugin
    function customLogger (fastify, options, done) {
      fastify.addHook('onRequest', (request, reply, done) => {
        request.log.info({
          req: request,
          timestamp: new Date().toISOString(),
          method: request.method,
          url: request.url
        }, 'Custom Request Log')
        done()
      })
      done()
    }

    fastify.register(customLogger)

    fastify.get('/', async (request, reply) => {
      return { hello: 'world' }
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.strictEqual(response.statusCode, 200)

    // Check that custom log message appears
    for await (const [line] of on(stream, 'data')) {
      if (line.msg === 'Custom Request Log') {
        t.assert.strictEqual(line.method, 'GET')
        t.assert.strictEqual(line.url, '/')
        break
      }
    }
  })

  await t.test('plugin hook runs for bad URL errors', async (t) => {
    t.plan(2)

    const stream = split(JSON.parse)
    const loggerInstance = pino({ level: 'info' }, stream)

    const fastify = Fastify({
      loggerInstance,
      disableRequestLogging: false,
      frameworkErrors: (error, request, reply) => {
        reply.code(400).send({ error: error.message })
      }
    })
    t.after(() => fastify.close())

    // Register custom logger plugin
    function customLogger (fastify, options, done) {
      fastify.addHook('onRequest', (request, reply, done) => {
        request.log.info({
          req: request,
          method: request.method
        }, 'Custom Request Log')
        done()
      })
      done()
    }

    fastify.register(customLogger)
    await fastify.ready()

    // Make request with bad URL (contains invalid characters)
    const response = await fastify.inject({ method: 'GET', url: '/test%' })
    t.assert.strictEqual(response.statusCode, 400)

    // Check that custom log message appears even for bad URL
    for await (const [line] of on(stream, 'data')) {
      if (line.msg === 'Custom Request Log') {
        t.assert.ok(line.method) // Should have method logged
        break
      }
    }
  })
})

