'use strict'

const split = require('split2')
const { test } = require('node:test')
const Fastify = require('../')
const {
  FST_ERR_BAD_URL,
  FST_ERR_ASYNC_CONSTRAINT
} = require('../lib/errors')

test('Should honor ignoreTrailingSlash option', async t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.get('/test', (req, res) => {
    res.send('test')
  })

  let res = await fastify.inject('/test')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')

  res = await fastify.inject('/test/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')
})

test('Should honor ignoreDuplicateSlashes option', async t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreDuplicateSlashes: true
  })

  fastify.get('/test//test///test', (req, res) => {
    res.send('test')
  })

  let res = await fastify.inject('/test/test/test')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')

  res = await fastify.inject('/test//test///test')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')
})

test('Should honor ignoreTrailingSlash and ignoreDuplicateSlashes options', async t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
  })

  fastify.get('/test//test///test', (req, res) => {
    res.send('test')
  })

  let res = await fastify.inject('/test/test/test/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')

  res = await fastify.inject('/test//test///test//')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.payload.toString(), 'test')
})

test('Should honor maxParamLength option', async (t) => {
  const fastify = Fastify({ maxParamLength: 10 })

  fastify.get('/test/:id', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  const res = await fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  })
  t.assert.strictEqual(res.statusCode, 200)

  const resError = await fastify.inject({
    method: 'GET',
    url: '/test/123456789abcd'
  })
  t.assert.strictEqual(resError.statusCode, 404)
})

test('Should expose router options via getters on request and reply', (t, done) => {
  t.plan(9)
  const fastify = Fastify()
  const expectedSchema = {
    params: {
      type: 'object',
      properties: {
        id: { type: 'integer' }
      }
    }
  }

  fastify.get('/test/:id', {
    schema: expectedSchema
  }, (req, reply) => {
    t.assert.strictEqual(reply.routeOptions.config.url, '/test/:id')
    t.assert.strictEqual(reply.routeOptions.config.method, 'GET')
    t.assert.deepStrictEqual(req.routeOptions.schema, expectedSchema)
    t.assert.strictEqual(typeof req.routeOptions.handler, 'function')
    t.assert.strictEqual(req.routeOptions.config.url, '/test/:id')
    t.assert.strictEqual(req.routeOptions.config.method, 'GET')
    t.assert.strictEqual(req.is404, false)
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    done()
  })
})

test('Should set is404 flag for unmatched paths', (t, done) => {
  t.plan(3)
  const fastify = Fastify()

  fastify.setNotFoundHandler((req, reply) => {
    t.assert.strictEqual(req.is404, true)
    reply.code(404).send({ error: 'Not Found', message: 'Four oh for', statusCode: 404 })
  })

  fastify.inject({
    method: 'GET',
    url: '/nonexist/123456789'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 404)
    done()
  })
})

test('Should honor frameworkErrors option - FST_ERR_BAD_URL', (t, done) => {
  t.plan(3)
  const fastify = Fastify({
    frameworkErrors: function (err, req, res) {
      if (err instanceof FST_ERR_BAD_URL) {
        t.assert.ok(true)
      } else {
        t.assert.fail()
      }
      res.send(`${err.message} - ${err.code}`)
    }
  })

  fastify.get('/test/:id', (req, res) => {
    res.send('{ hello: \'world\' }')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/test/%world'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')
      done()
    }
  )
})

test('Should supply Fastify request to the logger in frameworkErrors wrapper - FST_ERR_BAD_URL', (t, done) => {
  t.plan(8)

  const REQ_ID = 'REQ-1234'
  const logStream = split(JSON.parse)

  const fastify = Fastify({
    frameworkErrors: function (err, req, res) {
      t.assert.deepStrictEqual(req.id, REQ_ID)
      t.assert.deepStrictEqual(req.raw.httpVersion, '1.1')
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      serializers: {
        req (request) {
          t.assert.deepStrictEqual(request.id, REQ_ID)
          return { httpVersion: request.raw.httpVersion }
        }
      }
    },
    genReqId: () => REQ_ID
  })

  fastify.get('/test/:id', (req, res) => {
    res.send('{ hello: \'world\' }')
  })

  logStream.on('data', (json) => {
    t.assert.deepStrictEqual(json.msg, 'incoming request')
    t.assert.deepStrictEqual(json.reqId, REQ_ID)
    t.assert.deepStrictEqual(json.req.httpVersion, '1.1')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/test/%world'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')
      done()
    }
  )
})

test('Should honor disableRequestLogging option in frameworkErrors wrapper - FST_ERR_BAD_URL', (t, done) => {
  t.plan(2)

  const logStream = split(JSON.parse)

  const fastify = Fastify({
    disableRequestLogging: true,
    frameworkErrors: function (err, req, res) {
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      serializers: {
        req () {
          t.assert.fail('should not be called')
        },
        res () {
          t.assert.fail('should not be called')
        }
      }
    }
  })

  fastify.get('/test/:id', (req, res) => {
    res.send('{ hello: \'world\' }')
  })

  logStream.on('data', (json) => {
    t.assert.fail('should not be called')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/test/%world'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')
      done()
    }
  )
})

test('Should honor frameworkErrors option - FST_ERR_ASYNC_CONSTRAINT', (t, done) => {
  t.plan(3)

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx, done) => {
      done(Error('kaboom'))
    },
    validate () { return true }
  }

  const fastify = Fastify({
    frameworkErrors: function (err, req, res) {
      if (err instanceof FST_ERR_ASYNC_CONSTRAINT) {
        t.assert.ok(true)
      } else {
        t.assert.fail()
      }
      res.send(`${err.message} - ${err.code}`)
    },
    constraints: { secret: constraint }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, 'Unexpected error from async constraint - FST_ERR_ASYNC_CONSTRAINT')
      done()
    }
  )
})

test('Should supply Fastify request to the logger in frameworkErrors wrapper - FST_ERR_ASYNC_CONSTRAINT', (t, done) => {
  t.plan(8)

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx, done) => {
      done(Error('kaboom'))
    },
    validate () { return true }
  }

  const REQ_ID = 'REQ-1234'
  const logStream = split(JSON.parse)

  const fastify = Fastify({
    constraints: { secret: constraint },
    frameworkErrors: function (err, req, res) {
      t.assert.deepStrictEqual(req.id, REQ_ID)
      t.assert.deepStrictEqual(req.raw.httpVersion, '1.1')
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      serializers: {
        req (request) {
          t.assert.deepStrictEqual(request.id, REQ_ID)
          return { httpVersion: request.raw.httpVersion }
        }
      }
    },
    genReqId: () => REQ_ID
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  logStream.on('data', (json) => {
    t.assert.deepStrictEqual(json.msg, 'incoming request')
    t.assert.deepStrictEqual(json.reqId, REQ_ID)
    t.assert.deepStrictEqual(json.req.httpVersion, '1.1')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, 'Unexpected error from async constraint - FST_ERR_ASYNC_CONSTRAINT')
      done()
    }
  )
})

test('Should honor disableRequestLogging option in frameworkErrors wrapper - FST_ERR_ASYNC_CONSTRAINT', (t, done) => {
  t.plan(2)

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx, done) => {
      done(Error('kaboom'))
    },
    validate () { return true }
  }

  const logStream = split(JSON.parse)

  const fastify = Fastify({
    constraints: { secret: constraint },
    disableRequestLogging: true,
    frameworkErrors: function (err, req, res) {
      res.send(`${err.message} - ${err.code}`)
    },
    logger: {
      stream: logStream,
      serializers: {
        req () {
          t.assert.fail('should not be called')
        },
        res () {
          t.assert.fail('should not be called')
        }
      }
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  logStream.on('data', (json) => {
    t.assert.fail('should not be called')
  })

  fastify.inject(
    {
      method: 'GET',
      url: '/'
    },
    (err, res) => {
      t.assert.ifError(err)
      t.assert.strictEqual(res.body, 'Unexpected error from async constraint - FST_ERR_ASYNC_CONSTRAINT')
      done()
    }
  )
})
