'use strict'

const { test } = require('node:test')
const stream = require('node:stream')
const split = require('split2')

const Fastify = require('../../fastify')
const { on } = stream

test('logger custom serializers with customAttributeKeys', { timeout: 60000 }, async (t) => {
  t.plan(3)

  await t.test('Should use custom req serializer when provided with customAttributeKeys and serializer key matches custom key', async (t) => {
    t.plan(3)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          req: 'httpRequest'
        },
        serializers: {
          httpRequest: function (req) {
            return {
              customMethod: req.method,
              customUrl: req.url
            }
          }
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request') {
        t.assert.ok(line.httpRequest.customMethod, 'should use custom serializer with customMethod')
        t.assert.ok(line.httpRequest.customUrl, 'should use custom serializer with customUrl')
        break
      }
    }
  })

  await t.test('Should use custom res serializer when provided with customAttributeKeys and serializer key matches custom key', async (t) => {
    t.plan(3)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          res: 'httpResponse'
        },
        serializers: {
          httpResponse: function (reply) {
            return {
              customStatusCode: reply.statusCode,
              customField: 'custom'
            }
          }
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'request completed') {
        t.assert.ok(line.httpResponse.customStatusCode, 'should use custom serializer with customStatusCode')
        t.assert.strictEqual(line.httpResponse.customField, 'custom', 'should use custom serializer with customField')
        break
      }
    }
  })

  await t.test('Should use custom err serializer when provided with customAttributeKeys and serializer key matches custom key', async (t) => {
    t.plan(3)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          err: 'httpError'
        },
        serializers: {
          httpError: function (err) {
            return {
              customMessage: err.message,
              customType: 'CustomError'
            }
          }
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      throw new Error('test error')
    })

    fastify.setErrorHandler((err, req, reply) => {
      req.log.error({ httpError: err }, 'an error occurred')
      reply.status(500).send({ error: 'Internal Server Error' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 500)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'an error occurred') {
        t.assert.strictEqual(line.httpError.customMessage, 'test error', 'should use custom serializer with customMessage')
        t.assert.strictEqual(line.httpError.customType, 'CustomError', 'should use custom serializer with customType')
        break
      }
    }
  })
})

test('logger customAttributeKeys option', { timeout: 60000 }, async (t) => {
  t.plan(8)

  await t.test('Should remap req serializer when customAttributeKeys.req is set', async (t) => {
    t.plan(4)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          req: 'httpRequest'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request') {
        t.assert.ok(line.httpRequest, 'should have "httpRequest" key')
        t.assert.ok(line.httpRequest.method, 'should have method in httpRequest')
        t.assert.strictEqual(line.req, undefined, 'should not have "req" key')
        break
      }
    }
  })

  await t.test('Should remap res serializer when customAttributeKeys.res is set', async (t) => {
    t.plan(4)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          res: 'response'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'request completed') {
        t.assert.ok(line.response, 'should have "response" key')
        t.assert.ok(line.response.statusCode, 'should have statusCode in response')
        t.assert.strictEqual(line.res, undefined, 'should not have "res" key')
        break
      }
    }
  })

  await t.test('Should remap multiple serializers with customAttributeKeys', async (t) => {
    t.plan(5)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          req: 'request',
          res: 'response'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    let checkedRequest = false
    let checkedResponse = false

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request' && !checkedRequest) {
        t.assert.ok(line.request, 'should have "request" key')
        t.assert.strictEqual(line.req, undefined, 'should not have "req" key')
        checkedRequest = true
      }
      if (line.msg === 'request completed' && !checkedResponse) {
        t.assert.ok(line.response, 'should have "response" key')
        t.assert.strictEqual(line.res, undefined, 'should not have "res" key')
        checkedResponse = true
      }
      if (checkedRequest && checkedResponse) break
    }
  })

  await t.test('Should keep default serializer keys when customAttributeKeys is not provided', async (t) => {
    t.plan(5)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info'
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    let checkedReq = false
    let checkedRes = false

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request' && !checkedReq) {
        t.assert.ok(line.req, 'should have "req" key')
        t.assert.strictEqual(line.request, undefined, 'should not have "request" key')
        checkedReq = true
      }
      if (line.msg === 'request completed' && !checkedRes) {
        t.assert.ok(line.res, 'should have "res" key')
        t.assert.strictEqual(line.response, undefined, 'should not have "response" key')
        checkedRes = true
      }
      if (checkedReq && checkedRes) break
    }
  })

  await t.test('Should keep default key when customAttributeKeys has same value as default', async (t) => {
    t.plan(3)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          req: 'req'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request') {
        t.assert.ok(line.req, 'should have "req" key')
        t.assert.strictEqual(line.request, undefined, 'should not have "request" key')
        break
      }
    }
  })

  await t.test('Should handle empty customAttributeKeys object', async (t) => {
    t.plan(3)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {}
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request') {
        t.assert.ok(line.req, 'should have default "req" key')
        t.assert.strictEqual(line.request, undefined, 'should not have "request" key')
        break
      }
    }
  })

  await t.test('Should remap err serializer when customAttributeKeys.err is set', async (t) => {
    t.plan(4)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          err: 'error'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      throw new Error('test error')
    })

    fastify.setErrorHandler((err, req, reply) => {
      // When using customAttributeKeys.err = 'error', you must log with the custom key
      req.log.error({ error: err }, 'an error occurred')
      reply.status(500).send({ error: 'Internal Server Error' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 500)

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'an error occurred') {
        t.assert.ok(line.error, 'should have "error" key')
        t.assert.ok(line.error.message, 'should have message in error')
        t.assert.strictEqual(line.err, undefined, 'should not have "err" key')
        break
      }
    }
  })

  await t.test('Should remap all three serializers (req, res, err) simultaneously', async (t) => {
    t.plan(7)

    const loggerStream = split(JSON.parse)
    const fastify = Fastify({
      logger: {
        stream: loggerStream,
        level: 'info',
        customAttributeKeys: {
          req: 'request',
          res: 'response',
          err: 'error'
        }
      }
    })
    t.after(() => fastify.close())

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await fastify.ready()

    const response = await fastify.inject({ method: 'GET', url: '/' })
    t.assert.deepEqual(response.statusCode, 200)

    let checkedRequest = false
    let checkedResponse = false

    for await (const [line] of on(loggerStream, 'data')) {
      if (line.msg === 'incoming request' && !checkedRequest) {
        t.assert.ok(line.request, 'should have "request" key')
        t.assert.strictEqual(line.req, undefined, 'should not have "req" key')
        t.assert.strictEqual(line.response, undefined, 'should not have "response" key on request log')
        checkedRequest = true
      }
      if (line.msg === 'request completed' && !checkedResponse) {
        t.assert.ok(line.response, 'should have "response" key')
        t.assert.strictEqual(line.res, undefined, 'should not have "res" key')
        t.assert.strictEqual(line.request, undefined, 'should not have "request" key on response log')
        checkedResponse = true
      }
      if (checkedRequest && checkedResponse) break
    }
  })
})
