'use strict'

const test = require('tap').test
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
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')

  res = await fastify.inject('/test/')
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')
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
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')

  res = await fastify.inject('/test//test///test')
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')
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
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')

  res = await fastify.inject('/test//test///test//')
  t.equal(res.statusCode, 200)
  t.equal(res.payload.toString(), 'test')
})

test('Should honor maxParamLength option', t => {
  t.plan(4)
  const fastify = Fastify({ maxParamLength: 10 })

  fastify.get('/test/:id', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789abcd'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Should expose router options via getters on request and reply', t => {
  t.plan(10)
  const fastify = Fastify()
  const expectedSchema = {
    params: {
      id: { type: 'integer' }
    }
  }

  fastify.get('/test/:id', {
    schema: expectedSchema
  }, (req, reply) => {
    t.equal(reply.context.config.url, '/test/:id')
    t.equal(reply.context.config.method, 'GET')
    t.equal(req.routeConfig.url, '/test/:id')
    t.equal(req.routeConfig.method, 'GET')
    t.same(req.routeSchema, expectedSchema)
    t.equal(req.routerPath, '/test/:id')
    t.equal(req.routerMethod, 'GET')
    t.equal(req.is404, false)
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('Should set is404 flag for unmatched paths', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.setNotFoundHandler((req, reply) => {
    t.equal(req.is404, true)
    reply.code(404).send({ error: 'Not Found', message: 'Four oh for', statusCode: 404 })
  })

  fastify.inject({
    method: 'GET',
    url: '/nonexist/123456789'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Should honor frameworkErrors option - FST_ERR_BAD_URL', t => {
  t.plan(3)
  const fastify = Fastify({
    frameworkErrors: function (err, req, res) {
      if (err instanceof FST_ERR_BAD_URL) {
        t.ok(true)
      } else {
        t.fail()
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
      t.error(err)
      t.equal(res.body, '\'/test/%world\' is not a valid url component - FST_ERR_BAD_URL')
    }
  )
})

test('Should honor frameworkErrors option - FST_ERR_ASYNC_CONSTRAINT', t => {
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
        t.ok(true)
      } else {
        t.fail()
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
      t.error(err)
      t.equal(res.body, 'Unexpected error from async constraint - FST_ERR_ASYNC_CONSTRAINT')
    }
  )
})
