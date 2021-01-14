'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('Prefix options should add a prefix for all the routes inside a register / 1', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.get('/first', (req, reply) => {
    reply.send({ route: '/first' })
  })

  fastify.register(function (fastify, opts, done) {
    fastify.get('/first', (req, reply) => {
      reply.send({ route: '/v1/first' })
    })

    fastify.register(function (fastify, opts, done) {
      fastify.get('/first', (req, reply) => {
        reply.send({ route: '/v1/v2/first' })
      })
      done()
    }, { prefix: '/v2' })

    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/v2/first' })
  })
})

test('Prefix options should add a prefix for all the routes inside a register / 2', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/first', (req, reply) => {
      reply.send({ route: '/v1/first' })
    })

    fastify.get('/second', (req, reply) => {
      reply.send({ route: '/v1/second' })
    })
    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/second'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/second' })
  })
})

test('Prefix options should add a prefix for all the chained routes inside a register / 3', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify
      .get('/first', (req, reply) => {
        reply.send({ route: '/v1/first' })
      })
      .get('/second', (req, reply) => {
        reply.send({ route: '/v1/second' })
      })
    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/first'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/first' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/second'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/second' })
  })
})

test('Prefix should support parameters as well', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/hello', (req, reply) => {
      reply.send({ id: req.params.id })
    })
    done()
  }, { prefix: '/v1/:id' })

  fastify.inject({
    method: 'GET',
    url: '/v1/param/hello'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { id: 'param' })
  })
})

test('Prefix should support /', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })
    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Prefix without /', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })
    done()
  }, { prefix: 'v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Prefix with trailing /', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/route1', (req, reply) => {
      reply.send({ hello: 'world1' })
    })
    fastify.get('route2', (req, reply) => {
      reply.send({ hello: 'world2' })
    })

    fastify.register(function (fastify, opts, done) {
      fastify.get('/route3', (req, reply) => {
        reply.send({ hello: 'world3' })
      })
      done()
    }, { prefix: '/inner/' })

    done()
  }, { prefix: '/v1/' })

  fastify.inject({
    method: 'GET',
    url: '/v1/route1'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world1' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/route2'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world2' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/inner/route3'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world3' })
  })
})

test('Prefix works multiple levels deep', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.register(function (fastify, opts, done) {
      fastify.register(function (fastify, opts, done) {
        fastify.register(function (fastify, opts, done) {
          fastify.get('/', (req, reply) => {
            reply.send({ hello: 'world' })
          })
          done()
        }, { prefix: '/v3' })
        done()
      }) // No prefix on this level
      done()
    }, { prefix: 'v2' })
    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/v3'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Different register - encapsulation check', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/first', (req, reply) => {
    reply.send({ route: '/first' })
  })

  fastify.register(function (instance, opts, done) {
    instance.register(function (f, opts, done) {
      f.get('/', (req, reply) => {
        reply.send({ route: '/v1/v2' })
      })
      done()
    }, { prefix: '/v2' })
    done()
  }, { prefix: '/v1' })

  fastify.register(function (instance, opts, done) {
    instance.register(function (f, opts, done) {
      f.get('/', (req, reply) => {
        reply.send({ route: '/v3/v4' })
      })
      done()
    }, { prefix: '/v4' })
    done()
  }, { prefix: '/v3' })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v1/v2' })
  })

  fastify.inject({
    method: 'GET',
    url: '/v3/v4'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { route: '/v3/v4' })
  })
})

test('Can retrieve prefix within encapsulated instances', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.get('/one', function (req, reply) {
      reply.send(instance.prefix)
    })

    instance.register(function (instance, opts, done) {
      instance.get('/two', function (req, reply) {
        reply.send(instance.prefix)
      })
      done()
    }, { prefix: '/v2' })

    done()
  }, { prefix: '/v1' })

  fastify.inject({
    method: 'GET',
    url: '/v1/one'
  }, (err, res) => {
    t.error(err)
    t.is(res.payload, '/v1')
  })

  fastify.inject({
    method: 'GET',
    url: '/v1/v2/two'
  }, (err, res) => {
    t.error(err)
    t.is(res.payload, '/v1/v2')
  })
})

test('matches both /prefix and /prefix/ with a / route', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('prefix "/prefix/" does not match "/prefix" with a / route', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix/' })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('matches both /prefix and /prefix/ with a / route - ignoreTrailingSlash: true', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreTrailingSlash: false', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: false
  })

  fastify.register(function (fastify, opts, done) {
    fastify.route({
      method: 'GET',
      url: '/',
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    done()
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('returns 404 status code with /prefix/ and / route - prefixTrailingSlash: "both" (default), ignoreTrailingSlash: true', t => {
  t.plan(2)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.register(function (fastify, opts, done) {
    fastify.route({
      method: 'GET',
      url: '/',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    done()
  }, { prefix: '/prefix/' })

  fastify.inject({
    method: 'GET',
    url: '/prefix//'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'Route GET:/prefix// not found',
      statusCode: 404
    })
  })
})

test('matches only /prefix  with a / route - prefixTrailingSlash: "no-slash", ignoreTrailingSlash: false', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: false
  })

  fastify.register(function (fastify, opts, done) {
    fastify.route({
      method: 'GET',
      url: '/',
      prefixTrailingSlash: 'no-slash',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    done()
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.equal(JSON.parse(res.payload).statusCode, 404)
  })
})

test('matches only /prefix/  with a / route - prefixTrailingSlash: "slash", ignoreTrailingSlash: false', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: false
  })

  fastify.register(function (fastify, opts, done) {
    fastify.route({
      method: 'GET',
      url: '/',
      prefixTrailingSlash: 'slash',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    done()
  }, { prefix: '/prefix' })

  fastify.inject({
    method: 'GET',
    url: '/prefix/'
  }, (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), { hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/prefix'
  }, (err, res) => {
    t.error(err)
    t.equal(JSON.parse(res.payload).statusCode, 404)
  })
})

test('calls onRoute only once when prefixing', async t => {
  t.plan(1)
  const fastify = Fastify({
    ignoreTrailingSlash: false
  })

  let onRouteCalled = 0
  fastify.register(function (fastify, opts, next) {
    fastify.addHook('onRoute', () => {
      onRouteCalled++
    })

    fastify.route({
      method: 'GET',
      url: '/',
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  await fastify.ready()

  t.deepEqual(onRouteCalled, 1)
})
