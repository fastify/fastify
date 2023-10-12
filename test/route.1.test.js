'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')
const {
  FST_ERR_INSTANCE_ALREADY_LISTENING,
  FST_ERR_ROUTE_METHOD_INVALID
} = require('../lib/errors')
const { getServerUrl } = require('./helper')

test('route', t => {
  t.plan(10)
  const test = t.test

  test('route - get', t => {
    t.plan(4)

    const fastify = Fastify()
    t.doesNotThrow(() =>
      fastify.route({
        method: 'GET',
        url: '/',
        schema: {
          response: {
            '2xx': {
              type: 'object',
              properties: {
                hello: {
                  type: 'string'
                }
              }
            }
          }
        },
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
    )

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('missing schema - route', t => {
    t.plan(4)

    const fastify = Fastify()
    t.doesNotThrow(() =>
      fastify.route({
        method: 'GET',
        url: '/missing',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
    )

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/missing'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('invalid handler attribute - route', t => {
    t.plan(1)

    const fastify = Fastify()
    t.throws(() => fastify.get('/', { handler: 'not a function' }, () => { }))
  })

  test('Add Multiple methods per route all uppercase', t => {
    t.plan(7)

    const fastify = Fastify()
    t.doesNotThrow(() =>
      fastify.route({
        method: ['GET', 'DELETE'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('Add Multiple methods per route all lowercase', t => {
    t.plan(7)

    const fastify = Fastify()
    t.doesNotThrow(() =>
      fastify.route({
        method: ['get', 'delete'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('Add Multiple methods per route mixed uppercase and lowercase', t => {
    t.plan(7)

    const fastify = Fastify()
    t.doesNotThrow(() =>
      fastify.route({
        method: ['GET', 'delete'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('Add invalid Multiple methods per route', t => {
    t.plan(1)

    const fastify = Fastify()
    t.throws(() =>
      fastify.route({
        method: ['GET', 1],
        url: '/invalid-method',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_ROUTE_METHOD_INVALID())
  })

  test('Add method', t => {
    t.plan(1)

    const fastify = Fastify()
    t.throws(() =>
      fastify.route({
        method: 1,
        url: '/invalid-method',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_ROUTE_METHOD_INVALID())
  })

  test('Add additional multiple methods to existing route', t => {
    t.plan(7)

    const fastify = Fastify()
    t.doesNotThrow(() => {
      fastify.get('/add-multiple', function (req, reply) {
        reply.send({ hello: 'Bob!' })
      })
      fastify.route({
        method: ['PUT', 'DELETE'],
        url: '/add-multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
    })

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })
      sget({
        method: 'PUT',
        url: getServerUrl(fastify) + '/add-multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/add-multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })
    })
  })

  test('cannot add another route after binding', t => {
    t.plan(1)

    const fastify = Fastify()

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.error(err)
      t.teardown(() => { fastify.close() })

      t.throws(() => fastify.route({
        method: 'GET',
        url: '/another-get-route',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_INSTANCE_ALREADY_LISTENING('Cannot add route!'))
    })
  })
})

test('invalid schema - route', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.route({
    handler: () => { },
    method: 'GET',
    url: '/invalid',
    schema: {
      querystring: {
        id: 'string'
      }
    }
  })
  fastify.after(err => {
    t.notOk(err, 'the error is throw on preReady')
  })
  fastify.ready(err => {
    t.equal(err.code, 'FST_ERR_SCH_VALIDATION_BUILD')
    t.match(err.message, /Failed building the validation schema for GET: \/invalid/)
  })
})
