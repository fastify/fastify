'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const fastify = require('..')()

test('route - get', t => {
  t.plan(1)
  try {
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
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('missing schema - route', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/missing',
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('invalid schema - route', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/invalid',
      schema: {
        querystring: {
          id: 'string'
        }
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
    fastify.after(err => {
      t.ok(err instanceof Error)
    })
  } catch (e) {
    t.fail()
  }
})

test('Multiple methods', t => {
  t.plan(1)
  try {
    fastify.route({
      method: ['GET', 'DELETE'],
      url: '/multiple',
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('Add multiple methods', t => {
  t.plan(1)
  try {
    fastify.get('/add-multiple', function (req, reply) {
      reply.send({hello: 'Bob!'})
    })
    fastify.route({
      method: ['PUT', 'DELETE'],
      url: '/add-multiple',
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, function (err) {
  if (err) t.error(err)
  fastify.server.unref()

  test('cannot add another route after binding', t => {
    t.plan(1)
    try {
      fastify.route({
        method: 'GET',
        url: '/another-get-route',
        handler: function (req, reply) {
          reply.send({ hello: 'world' })
        }
      })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })

  test('route - get', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('route - missing schema', t => {
    t.plan(3)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/missing'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('route - multiple methods', t => {
    t.plan(6)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/multiple'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port + '/multiple'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('path can be specified in place of uri', t => {
  t.plan(3)

  fastify.route({
    method: 'GET',
    path: '/path',
    handler: function (req, reply) {
      reply.send({ hello: 'world' })
    }
  })

  const reqOpts = {
    method: 'GET',
    url: '/path'
  }

  fastify.inject(reqOpts, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('invalid bodyLimit option - route', t => {
  t.plan(2)

  try {
    fastify.route({
      bodyLimit: false,
      method: 'PUT',
      handler: () => null
    })
    t.fail('bodyLimit must be an integer')
  } catch (err) {
    t.ok(err)
  }

  try {
    fastify.post('/url', { bodyLimit: 10000.1 }, () => null)
    t.fail('bodyLimit must be an integer')
  } catch (err) {
    t.ok(err)
  }
})
