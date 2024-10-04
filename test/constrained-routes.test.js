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
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: {
      host: 'fastify.io'
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
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.send('fastify.io')
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
      host: 'fastify.io'
    }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.equal(res.payload, 'fastify.io')
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
      let secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store },
        del: (secret) => { delete secrets[secret] },
        empty: () => { secrets = {} }
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

test('Should allow registering an unconstrained route after a constrained route', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.send({ hello: 'from fastify.io' })
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
      host: 'fastify.io'
    }
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'from fastify.io' })
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
      constraints: { host: 'fastify.io' },
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
      host: 'fastify.io'
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
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.header('content-type', 'text/plain')
      reply.send('custom HEAD response')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      host: 'fastify.io'
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
      reply.send('custom HEAD response')
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    constraints: { host: 'fastify.io' },
    handler: (req, reply) => {
      reply.send({ hello: 'from any other domain' })
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/',
    headers: {
      host: 'fastify.io'
    }
  }, (err, res) => {
    t.error(err)
    t.same(res.payload, 'custom HEAD response')
    t.equal(res.statusCode, 200)
  })
})

test('Will not try to re-createprefixed HEAD route if it already exists and exposeHeadRoutes is true for constrained routes', async (t) => {
  t.plan(1)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.register((scope, opts) => {
    scope.route({
      method: 'HEAD',
      path: '/route',
      constraints: { host: 'fastify.io' },
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('custom HEAD response')
      }
    })
    scope.route({
      method: 'GET',
      path: '/route',
      constraints: { host: 'fastify.io' },
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

  fastify.register((scope, opts) => {
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
      constraints: { host: 'fastify.io' },
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('constrained HEAD response')
      }
    })

    scope.route({
      method: 'GET',
      path: '/route',
      constraints: { host: 'fastify.io' },
      handler: (req, reply) => {
        reply.send({ ok: true })
      }
    })

    next()
  }, { prefix: '/prefix' })

  await fastify.ready()

  t.ok(true)
})
