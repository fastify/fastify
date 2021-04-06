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
