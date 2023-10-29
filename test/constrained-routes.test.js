'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('Should register a host constrained route', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'example.com'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should register the same route with host constraints', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.send('fastify.dev')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'example.com' },
    handler: (req, reply) => {
      reply.send('example.com')
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'fastify.dev')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'example.com'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'example.com')
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'fancy.ca'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should allow registering custom constrained routes', t => {
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
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify({ constraints: { secret: constraint } })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'beta' },
    handler: (req, reply) => {
      reply.send({ hello: 'from beta' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'alpha'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from alpha' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'beta'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from beta' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'gamma'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Should allow registering custom constrained routes outside constructor', t => {
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
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()
  fastify.addConstraintStrategy(constraint)

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'beta' },
    handler: (req, reply) => {
      reply.send({ hello: 'from beta' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'alpha'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from alpha' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'beta'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from beta' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      'X-Secret': 'gamma'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('Custom constrained routes registered also for HEAD method generated by fastify', t => {
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
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify({ constraints: { secret: constraint } })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'mySecret' },
    handler: (req, reply) => {
      reply.send('from mySecret - my length is 31')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      'X-Secret': 'mySecret'
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.headers['content-length'], '31')
    t.equal(res.statusCode, 200)
  })
})

test('Custom constrained routes registered with addConstraintStrategy apply also for HEAD method generated by fastify', t => {
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
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()
  fastify.addConstraintStrategy(constraint)

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'mySecret' },
    handler: (req, reply) => {
      reply.send('from mySecret - my length is 31')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      'X-Secret': 'mySecret'
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.headers['content-length'], '31')
    t.equal(res.statusCode, 200)
  })
})

test('Add a constraint strategy after fastify instance was started', t => {
  t.plan(4)

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => { reply.send('ok') }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'ok')
    t.equal(res.statusCode, 200)

    t.throws(
      () => fastify.addConstraintStrategy(constraint),
      'Cannot add constraint strategy when fastify instance is already started!'
    )
  })
})

test('Add a constraint strategy should throw an error if there already exist custom strategy with the same name', t => {
  t.plan(1)

  const constraint = {
    name: 'secret',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()

  fastify.addConstraintStrategy(constraint)
  t.throws(
    () => fastify.addConstraintStrategy(constraint),
    'There already exists a custom constraint with the name secret.'
  )
})

test('Add a constraint strategy shouldn\'t throw an error if default constraint with the same name isn\'t used', t => {
  t.plan(1)

  const constraint = {
    name: 'version',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()
  fastify.addConstraintStrategy(constraint)

  t.pass()
})

test('Add a constraint strategy should throw an error if default constraint with the same name is used', t => {
  t.plan(1)

  const constraint = {
    name: 'version',
    storage: function () {
      const secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.0.0' },
    handler: (req, reply) => {
      reply.send('ok')
    }
  })

  t.throws(
    () => fastify.addConstraintStrategy(constraint),
    'There already exists a route with version constraint.'
  )
})

test('The hasConstraintStrategy should return false for default constraints until they are used', t => {
  t.plan(6)

  const fastify = Fastify()

  t.equal(fastify.hasConstraintStrategy('version'), false)
  t.equal(fastify.hasConstraintStrategy('host'), false)

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  t.equal(fastify.hasConstraintStrategy('version'), false)
  t.equal(fastify.hasConstraintStrategy('host'), true)

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { version: '1.0.0' },
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  t.equal(fastify.hasConstraintStrategy('version'), true)
  t.equal(fastify.hasConstraintStrategy('host'), true)
})

test('The hasConstraintStrategy should return true if there already exist a custom constraint with the same name', t => {
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
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const fastify = Fastify()

  t.equal(fastify.hasConstraintStrategy('secret'), false)
  fastify.addConstraintStrategy(constraint)
  t.equal(fastify.hasConstraintStrategy('secret'), true)
})

test('Should allow registering an unconstrained route after a constrained route', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.send({ hello: 'from fastify.dev' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from fastify.dev' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'example.com'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from any other domain' })
    t.equal(res.statusCode, 200)
  })
})

test('Should allow registering constrained routes in a prefixed plugin', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(async (scope, opts) => {
    scope.route({
      method: 'GET',
      constraints: { host: 'fastify.dev' },
      path: '/route',
      handler: (req, reply) => {
        reply.send({ ok: true })
      }
    })
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix/route',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { ok: true })
    t.equal(res.statusCode, 200)
  })
})

test('Should allow registering a constrained GET route after a constrained HEAD route', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.route({
    method: 'HEAD',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.header('content-type', 'text/plain')
      reply.send('custom HEAD response')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'custom HEAD response')
    t.equal(res.statusCode, 200)
  })
})

test('Should allow registering a constrained GET route after an unconstrained HEAD route', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.route({
    method: 'HEAD',
    url: '/',
    handler: (req, reply) => {
      reply.header('content-type', 'text/plain')
      reply.send('HEAD response: length is about 33')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.dev' },
    handler: (req, reply) => {
      reply.header('content-type', 'text/plain')
      reply.send('Hello from constrains: length is about 41')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      host: 'fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.headers['content-length'], '41')
    t.equal(res.statusCode, 200)
  })
})

test('Will not try to re-createprefixed HEAD route if it already exists and exposeHeadRoutes is true for constrained routes', async (t) => {
  t.plan(1)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.register((scope, opts, next) => {
    scope.route({
      method: 'HEAD',
      path: '/route',
      constraints: { host: 'fastify.dev' },
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('custom HEAD response')
      }
    })
    scope.route({
      method: 'GET',
      path: '/route',
      constraints: { host: 'fastify.dev' },
      handler: (req, reply) => {
        reply.send({ ok: true })
      }
    })

    next()
  }, { prefix: '/prefix' })

  await fastify.ready()

  t.ok(true)
})

test('allows separate constrained and unconstrained HEAD routes', async (t) => {
  t.plan(1)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.register((scope, opts, next) => {
    scope.route({
      method: 'HEAD',
      path: '/route',
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('unconstrained HEAD response')
      }
    })

    scope.route({
      method: 'HEAD',
      path: '/route',
      constraints: { host: 'fastify.dev' },
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('constrained HEAD response')
      }
    })

    scope.route({
      method: 'GET',
      path: '/route',
      constraints: { host: 'fastify.dev' },
      handler: (req, reply) => {
        reply.send({ ok: true })
      }
    })

    next()
  }, { prefix: '/prefix' })

  await fastify.ready()

  t.ok(true)
})

test('allow async constraints', async (t) => {
  t.plan(5)

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
      done(null, req.headers['x-secret'])
    },
    validate () { return true }
  }

  const fastify = Fastify({ constraints: { secret: constraint } })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'beta' },
    handler: (req, reply) => {
      reply.send({ hello: 'from beta' })
    }
  })

  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'alpha' } })
    t.same(JSON.parse(payload), { hello: 'from alpha' })
    t.equal(statusCode, 200)
  }
  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'beta' } })
    t.same(JSON.parse(payload), { hello: 'from beta' })
    t.equal(statusCode, 200)
  }
  {
    const { statusCode } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'gamma' } })
    t.equal(statusCode, 404)
  }
})

test('error in async constraints', async (t) => {
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

  const fastify = Fastify({ constraints: { secret: constraint } })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'alpha' },
    handler: (req, reply) => {
      reply.send({ hello: 'from alpha' })
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { secret: 'beta' },
    handler: (req, reply) => {
      reply.send({ hello: 'from beta' })
    }
  })

  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'alpha' } })
    t.same(JSON.parse(payload), { error: 'Internal Server Error', message: 'Unexpected error from async constraint', statusCode: 500 })
    t.equal(statusCode, 500)
  }
  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'beta' } })
    t.same(JSON.parse(payload), { error: 'Internal Server Error', message: 'Unexpected error from async constraint', statusCode: 500 })
    t.equal(statusCode, 500)
  }
  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/', headers: { 'X-Secret': 'gamma' } })
    t.same(JSON.parse(payload), { error: 'Internal Server Error', message: 'Unexpected error from async constraint', statusCode: 500 })
    t.equal(statusCode, 500)
  }
  {
    const { statusCode, payload } = await fastify.inject({ method: 'GET', path: '/' })
    t.same(JSON.parse(payload), { error: 'Internal Server Error', message: 'Unexpected error from async constraint', statusCode: 500 })
    t.equal(statusCode, 500)
  }
})

test('Allow regex constraints in routes', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: /.*\.fastify\.dev$/ },
    handler: (req, reply) => {
      reply.send({ hello: 'from fastify dev domain' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'dev.fastify.dev'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from fastify dev domain' })
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'google.com'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})
