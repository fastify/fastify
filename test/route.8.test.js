'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const {
  FST_ERR_INVALID_URL
} = require('../lib/errors')
const { getServerUrl } = require('./helper')

test('Request and Reply share the route options', async t => {
  t.plan(3)

  const fastify = Fastify()

  const config = {
    this: 'is a string',
    thisIs: function aFunction () {}
  }

  fastify.route({
    method: 'GET',
    url: '/',
    config,
    handler: (req, reply) => {
      t.same(req.routeOptions, reply.routeOptions)
      t.same(req.routeOptions.config, reply.routeOptions.config)
      t.match(req.routeOptions.config, config, 'there are url and method additional properties')

      reply.send({ hello: 'world' })
    }
  })

  await fastify.inject('/')
})

test('Will not try to re-createprefixed HEAD route if it already exists and exposeHeadRoutes is true', async (t) => {
  t.plan(1)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.register((scope, opts, next) => {
    scope.route({
      method: 'HEAD',
      path: '/route',
      handler: (req, reply) => {
        reply.header('content-type', 'text/plain')
        reply.send('custom HEAD response')
      }
    })
    scope.route({
      method: 'GET',
      path: '/route',
      handler: (req, reply) => {
        reply.send({ ok: true })
      }
    })

    next()
  }, { prefix: '/prefix' })

  await fastify.ready()

  t.ok(true)
})

test('route with non-english characters', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/föö', (request, reply) => {
    reply.send('here /föö')
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: getServerUrl(fastify) + encodeURI('/föö')
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'here /föö')
    })
  })
})

test('invalid url attribute - non string URL', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.get(/^\/(donations|skills|blogs)/, () => { })
  } catch (error) {
    t.equal(error.code, FST_ERR_INVALID_URL().code)
  }
})

test('exposeHeadRoute should not reuse the same route option', async t => {
  t.plan(2)

  const fastify = Fastify()

  // we update the onRequest hook in onRoute hook
  // if we reuse the same route option
  // that means we will append another function inside the array
  fastify.addHook('onRoute', function (routeOption) {
    if (Array.isArray(routeOption.onRequest)) {
      routeOption.onRequest.push(() => {})
    } else {
      routeOption.onRequest = [() => {}]
    }
  })

  fastify.addHook('onRoute', function (routeOption) {
    t.equal(routeOption.onRequest.length, 1)
  })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    async handler () {
      return 'hello world'
    }
  })
})

test('using fastify.all when a catchall is defined does not degrade performance', { timeout: 30000 }, async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/*', async (_, reply) => reply.json({ ok: true }))

  for (let i = 0; i < 100; i++) {
    fastify.all(`/${i}`, async (_, reply) => reply.json({ ok: true }))
  }

  t.pass()
})

test('Adding manually HEAD route after GET with the same path throws Fastify duplicated route instance error', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/:param1',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  try {
    fastify.route({
      method: 'HEAD',
      path: '/:param2',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })
    t.fail('Should throw fastify duplicated route declaration')
  } catch (error) {
    t.equal(error.code, 'FST_ERR_DUPLICATED_ROUTE')
  }
})
