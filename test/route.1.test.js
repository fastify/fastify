'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('..')
const {
  FST_ERR_INSTANCE_ALREADY_LISTENING,
  FST_ERR_ROUTE_METHOD_INVALID
} = require('../lib/errors')
const { getServerUrl } = require('./helper')

test('route', async t => {
  t.plan(10)

  await t.test('route - get', (t, done) => {
    t.plan(4)

    const fastify = Fastify()
    t.assert.doesNotThrow(() =>
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
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  await t.test('missing schema - route', (t, done) => {
    t.plan(4)

    const fastify = Fastify()
    t.assert.doesNotThrow(() =>
      fastify.route({
        method: 'GET',
        url: '/missing',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
    )

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/missing'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  await t.test('invalid handler attribute - route', t => {
    t.plan(1)

    const fastify = Fastify()
    t.assert.throws(() => fastify.get('/', { handler: 'not a function' }, () => { }))
  })

  await t.test('Add Multiple methods per route all uppercase', (t, done) => {
    t.plan(7)

    const fastify = Fastify()
    t.assert.doesNotThrow(() =>
      fastify.route({
        method: ['GET', 'DELETE'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  await t.test('Add Multiple methods per route all lowercase', (t, done) => {
    t.plan(7)

    const fastify = Fastify()
    t.assert.doesNotThrow(() =>
      fastify.route({
        method: ['get', 'delete'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  await t.test('Add Multiple methods per route mixed uppercase and lowercase', (t, done) => {
    t.plan(7)

    const fastify = Fastify()
    t.assert.doesNotThrow(() =>
      fastify.route({
        method: ['GET', 'delete'],
        url: '/multiple',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }))

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'GET',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  t.test('Add invalid Multiple methods per route', t => {
    t.plan(1)

    const fastify = Fastify()
    t.assert.throws(() =>
      fastify.route({
        method: ['GET', 1],
        url: '/invalid-method',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_ROUTE_METHOD_INVALID())
  })

  await t.test('Add method', t => {
    t.plan(1)

    const fastify = Fastify()
    t.assert.throws(() =>
      fastify.route({
        method: 1,
        url: '/invalid-method',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_ROUTE_METHOD_INVALID())
  })

  await t.test('Add additional multiple methods to existing route', (t, done) => {
    t.plan(7)

    const fastify = Fastify()
    t.assert.doesNotThrow(() => {
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
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })
      sget({
        method: 'PUT',
        url: getServerUrl(fastify) + '/add-multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getServerUrl(fastify) + '/add-multiple'
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
        done()
      })
    })
  })

  await t.test('cannot add another route after binding', (t, done) => {
    t.plan(1)

    const fastify = Fastify()

    fastify.listen({ port: 0 }, function (err) {
      if (err) t.assert.ifError(err)
      t.after(() => { fastify.close() })

      t.assert.throws(() => fastify.route({
        method: 'GET',
        url: '/another-get-route',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      }), new FST_ERR_INSTANCE_ALREADY_LISTENING('Cannot add route!'))

      done()
    })
  })
})

test('invalid schema - route', (t, done) => {
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
    t.assert.ok(!err, 'the error is throw on preReady')
  })
  fastify.ready(err => {
    t.assert.strictEqual(err.code, 'FST_ERR_SCH_VALIDATION_BUILD')
    t.assert.match(err.message, /Failed building the validation schema for GET: \/invalid/)
    done()
  })
})
