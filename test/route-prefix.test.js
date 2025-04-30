'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { sequence } = require('./toolkit')

test('Prefix options should add a prefix for all the routes inside a register / 1', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/first'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/first' })
      done()
    }), (done) => fastify.inject({
      method: 'GET',
      url: '/v1/first'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/first' })
      done()
    }), (done) => fastify.inject({
      method: 'GET',
      url: '/v1/v2/first'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/v2/first' })
      done(testDone)
    })
  ])
})

test('Prefix options should add a prefix for all the routes inside a register / 2', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/first'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/first' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/second'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/second' })
      done(testDone)
    })
  ])
})

test('Prefix options should add a prefix for all the chained routes inside a register / 3', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/first'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/first' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/second'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/second' })
      done(testDone)
    })
  ])
})

test('Prefix should support parameters as well', (t, testDone) => {
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { id: 'param' })
    testDone()
  })
})

test('Prefix should support /', (t, testDone) => {
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('Prefix without /', (t, testDone) => {
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('Prefix with trailing /', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/route1'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world1' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/route2'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world2' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/inner/route3'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world3' })
      done(testDone)
    })
  ])
})

test('Prefix works multiple levels deep', (t, testDone) => {
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('Different register - encapsulation check', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/v2'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v1/v2' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v3/v4'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { route: '/v3/v4' })
      done(testDone)
    })
  ])
})

test('Can retrieve prefix within encapsulated instances', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/one'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(res.payload, '/v1')
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/v1/v2/two'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(res.payload, '/v1/v2')
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/ with a / route', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('prefix "/prefix/" does not match "/prefix" with a / route', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix/' })

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(res.statusCode, 404)
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/ with a / route - ignoreTrailingSlash: true', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/ with a / route - ignoreDuplicateSlashes: true', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify({
    ignoreDuplicateSlashes: true
  })

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreTrailingSlash: false', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreDuplicateSlashes: false', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify({
    ignoreDuplicateSlashes: false
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/ with a / route - ignoreTrailingSlash: true, ignoreDuplicateSlashes: true', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
  })

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('matches both /prefix and /prefix/ with a / route - ignoreTrailingSlash: true, ignoreDuplicateSlashes: false', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: false
  })

  fastify.register(function (fastify, opts, done) {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    done()
  }, { prefix: '/prefix' })

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done(testDone)
    })
  ])
})

test('returns 404 status code with /prefix/ and / route - prefixTrailingSlash: "both" (default), ignoreTrailingSlash: true', (t, testDone) => {
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'Route GET:/prefix// not found',
      statusCode: 404
    })
    testDone()
  })
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreDuplicateSlashes: true', (t, testDone) => {
  t.plan(2)
  const fastify = Fastify({
    ignoreDuplicateSlashes: true
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreTrailingSlash: true, ignoreDuplicateSlashes: true', (t, testDone) => {
  t.plan(2)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('matches both /prefix and /prefix/  with a / route - prefixTrailingSlash: "both", ignoreDuplicateSlashes: true', (t, testDone) => {
  t.plan(2)
  const fastify = Fastify({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true
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
    t.assert.ifError(err)
    t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
    testDone()
  })
})

test('matches only /prefix  with a / route - prefixTrailingSlash: "no-slash", ignoreTrailingSlash: false', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload).statusCode, 404)
      done(testDone)
    })
  ])
})

test('matches only /prefix  with a / route - prefixTrailingSlash: "no-slash", ignoreDuplicateSlashes: false', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify({
    ignoreDuplicateSlashes: false
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload).statusCode, 404)
      done(testDone)
    })
  ])
})

test('matches only /prefix/  with a / route - prefixTrailingSlash: "slash", ignoreTrailingSlash: false', (t, testDone) => {
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

  sequence([
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix/'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload), { hello: 'world' })
      done()
    }),
    (done) => fastify.inject({
      method: 'GET',
      url: '/prefix'
    }, (err, res) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(res.payload).statusCode, 404)
      done(testDone)
    })
  ])
})

test('calls onRoute only once when prefixing', async t => {
  t.plan(1)
  const fastify = Fastify({
    ignoreTrailingSlash: false,
    exposeHeadRoutes: false
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

  t.assert.deepStrictEqual(onRouteCalled, 1)
})
