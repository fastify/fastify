'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const joi = require('@hapi/joi')
const Fastify = require('..')

test('route', t => {
  t.plan(9)
  const test = t.test
  const fastify = Fastify()

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

  test('invalid handler attribute - route', t => {
    t.plan(1)
    try {
      fastify.get('/', { handler: 'not a function' }, () => {})
      t.fail()
    } catch (e) {
      t.pass()
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
        reply.send({ hello: 'Bob!' })
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
})

test('invalid schema - route', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.route({
    handler: () => {},
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
    t.is(err.code, 'FST_ERR_SCH_VALIDATION_BUILD')
    t.isLike(err.message, /Failed building the validation schema for GET: \/invalid/)
  })
})

test('same route definition object on multiple prefixes', async t => {
  t.plan(2)

  const routeObject = {
    handler: () => {},
    method: 'GET',
    url: '/simple'
  }

  const fastify = Fastify()

  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.is(routeOptions.url, '/v1/simple')
    })
    f.route(routeObject)
  }, { prefix: '/v1' })
  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.is(routeOptions.url, '/v2/simple')
    })
    f.route(routeObject)
  }, { prefix: '/v2' })

  await fastify.ready()
})

test('path can be specified in place of uri', t => {
  t.plan(3)
  const fastify = Fastify()

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
  const fastify = Fastify()

  try {
    fastify.route({
      bodyLimit: false,
      method: 'PUT',
      handler: () => null
    })
    t.fail('bodyLimit must be an integer')
  } catch (err) {
    t.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got 'false'")
  }

  try {
    fastify.post('/url', { bodyLimit: 10000.1 }, () => null)
    t.fail('bodyLimit must be an integer')
  } catch (err) {
    t.strictEqual(err.message, "'bodyLimit' option must be an integer > 0. Got '10000.1'")
  }
})

test('handler function in options of shorthand route should works correctly', t => {
  t.plan(3)

  const fastify = Fastify()
  fastify.get('/foo', {
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/foo'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('does not mutate joi schemas', t => {
  t.plan(4)

  const fastify = Fastify()
  function validatorCompiler ({ schema, method, url, httpPart }) {
    // Needed to extract the params part,
    // without the JSON-schema encapsulation
    // that is automatically added by the short
    // form of params.
    schema = joi.object(schema.properties)

    return validateHttpData

    function validateHttpData (data) {
      return schema.validate(data)
    }
  }

  fastify.setValidatorCompiler(validatorCompiler)

  fastify.route({
    path: '/foo/:an_id',
    method: 'GET',
    schema: {
      params: { an_id: joi.number() }
    },
    handler (req, res) {
      t.deepEqual(req.params, { an_id: 42 })
      res.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/42'
  }, (err, result) => {
    t.error(err)
    t.strictEqual(result.statusCode, 200)
    t.deepEqual(JSON.parse(result.payload), { hello: 'world' })
  })
})

test('multiple routes with one schema', t => {
  t.plan(2)

  const fastify = Fastify()

  const schema = {
    query: {
      id: { type: 'number' }
    }
  }

  fastify.route({
    schema,
    method: 'GET',
    path: '/first/:id',
    handler (req, res) {
      res.send({ hello: 'world' })
    }
  })

  fastify.route({
    schema,
    method: 'GET',
    path: '/second/:id',
    handler (req, res) {
      res.send({ hello: 'world' })
    }
  })

  fastify.ready(error => {
    t.error(error)
    t.deepEquals(schema, schema)
  })
})

test('route error handler overrides default error handler', t => {
  t.plan(4)

  const fastify = Fastify()

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')

    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 418)
    t.deepEqual(JSON.parse(res.payload), {
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  })
})

test('route error handler does not affect other routes', t => {
  t.plan(3)

  const fastify = Fastify()

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')

    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.route({
    method: 'GET',
    path: '/tea',
    handler: (req, res) => {
      res.send(new Error('No tea today'))
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/tea'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 500)
    t.deepEqual(JSON.parse(res.payload), {
      message: 'No tea today',
      statusCode: 500,
      error: 'Internal Server Error'
    })
  })
})

test('async error handler for a route', t => {
  t.plan(4)

  const fastify = Fastify()

  const customRouteErrorHandler = async (error, request, reply) => {
    t.equal(error.message, 'Delayed Pot Error')
    reply.code(418)
    return {
      message: 'Make a brew sometime later',
      statusCode: 418,
      error: 'Delayed Pot Error'
    }
  }

  fastify.route({
    method: 'GET',
    path: '/late-coffee',
    handler: (req, res) => {
      res.send(new Error('Delayed Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/late-coffee'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 418)
    t.deepEqual(JSON.parse(res.payload), {
      message: 'Make a brew sometime later',
      statusCode: 418,
      error: 'Delayed Pot Error'
    })
  })
})

test('route error handler overrides global custom error handler', t => {
  t.plan(4)

  const fastify = Fastify()

  const customGlobalErrorHandler = (error, request, reply) => {
    t.error(error)
    reply.code(429).send({ message: 'Too much coffee' })
  }

  const customRouteErrorHandler = (error, request, reply) => {
    t.equal(error.message, 'Wrong Pot Error')
    reply.code(418).send({
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  }

  fastify.setErrorHandler(customGlobalErrorHandler)

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, res) => {
      res.send(new Error('Wrong Pot Error'))
    },
    errorHandler: customRouteErrorHandler
  })

  fastify.inject({
    method: 'GET',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 418)
    t.deepEqual(JSON.parse(res.payload), {
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  })
})

test('throws when route-level error handler is not a function', t => {
  t.plan(1)

  const fastify = Fastify()

  try {
    fastify.route({
      method: 'GET',
      url: '/tea',
      handler: (req, res) => {
        res.send('hi!')
      },
      errorHandler: 'teapot'
    })
  } catch (err) {
    t.is(err.message, 'Error Handler for GET:/tea route, if defined, must be a function')
  }
})
