'use strict'

const stream = require('stream')
const split = require('split2')
const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const joi = require('joi')
const Fastify = require('..')
const proxyquire = require('proxyquire')
const {
  FST_ERR_INVALID_URL,
  FST_ERR_INSTANCE_ALREADY_LISTENING,
  FST_ERR_ROUTE_METHOD_INVALID
} = require('../lib/errors')

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

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
        url: getUrl(fastify) + '/'
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
        url: getUrl(fastify) + '/missing'
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
        url: getUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getUrl(fastify) + '/multiple'
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
        url: getUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getUrl(fastify) + '/multiple'
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
        url: getUrl(fastify) + '/multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getUrl(fastify) + '/multiple'
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
        url: getUrl(fastify) + '/add-multiple'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'DELETE',
        url: getUrl(fastify) + '/add-multiple'
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

test('same route definition object on multiple prefixes', async t => {
  t.plan(2)

  const routeObject = {
    handler: () => { },
    method: 'GET',
    url: '/simple'
  }

  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.equal(routeOptions.url, '/v1/simple')
    })
    f.route(routeObject)
  }, { prefix: '/v1' })
  fastify.register(async function (f) {
    f.addHook('onRoute', (routeOptions) => {
      t.equal(routeOptions.url, '/v2/simple')
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
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
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
    t.equal(err.message, "'bodyLimit' option must be an integer > 0. Got 'false'")
  }

  try {
    fastify.post('/url', { bodyLimit: 10000.1 }, () => null)
    t.fail('bodyLimit must be an integer')
  } catch (err) {
    t.equal(err.message, "'bodyLimit' option must be an integer > 0. Got '10000.1'")
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
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'world' })
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
      t.same(req.params, { an_id: 42 })
      res.send({ hello: 'world' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/foo/42'
  }, (err, result) => {
    t.error(err)
    t.equal(result.statusCode, 200)
    t.same(JSON.parse(result.payload), { hello: 'world' })
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
    t.same(schema, schema)
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
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
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
    t.equal(res.statusCode, 500)
    t.same(JSON.parse(res.payload), {
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
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
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
    t.equal(res.statusCode, 418)
    t.same(JSON.parse(res.payload), {
      message: 'Make a brew',
      statusCode: 418,
      error: 'Wrong Pot Error'
    })
  })
})

test('throws when route with empty url', async t => {
  t.plan(1)

  const fastify = Fastify()
  try {
    fastify.route({
      method: 'GET',
      url: '',
      handler: (req, res) => {
        res.send('hi!')
      }
    })
  } catch (err) {
    t.equal(err.message, 'The path could not be empty')
  }
})

test('throws when route with empty url in shorthand declaration', async t => {
  t.plan(1)

  const fastify = Fastify()
  try {
    fastify.get(
      '',
      async function handler () { return {} }
    )
  } catch (err) {
    t.equal(err.message, 'The path could not be empty')
  }
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
    t.equal(err.message, 'Error Handler for GET:/tea route, if defined, must be a function')
  }
})

test('route child logger factory overrides default child logger factory', t => {
  t.plan(3)

  const fastify = Fastify()

  const customRouteChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.customLog = function (message) {
      t.equal(message, 'custom')
    }
    return child
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      req.log.customLog('custom')
      res.send()
    },
    childLoggerFactory: customRouteChildLogger
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('route child logger factory does not affect other routes', t => {
  t.plan(6)

  const fastify = Fastify()

  const customRouteChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.customLog = function (message) {
      t.equal(message, 'custom')
    }
    return child
  }

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      req.log.customLog('custom')
      res.send()
    },
    childLoggerFactory: customRouteChildLogger
  })

  fastify.route({
    method: 'GET',
    path: '/tea',
    handler: (req, res) => {
      t.notMatch(req.log.customLog instanceof Function)
      res.send()
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
  fastify.inject({
    method: 'GET',
    url: '/tea'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})
test('route child logger factory overrides global custom error handler', t => {
  t.plan(6)

  const fastify = Fastify()

  const customGlobalChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.globalLog = function (message) {
      t.equal(message, 'global')
    }
    return child
  }
  const customRouteChildLogger = (logger, bindings, opts, req) => {
    const child = logger.child(bindings, opts)
    child.customLog = function (message) {
      t.equal(message, 'custom')
    }
    return child
  }

  fastify.setChildLoggerFactory(customGlobalChildLogger)

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: (req, res) => {
      req.log.customLog('custom')
      res.send()
    },
    childLoggerFactory: customRouteChildLogger
  })
  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, res) => {
      req.log.globalLog('global')
      res.send()
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
  fastify.inject({
    method: 'GET',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })
})

test('Creates a HEAD route for each GET one (default)', t => {
  t.plan(8)

  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.body, '')
  })
})

test('Do not create a HEAD route for each GET one (exposeHeadRoutes: false)', t => {
  t.plan(4)

  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Creates a HEAD route for each GET one', t => {
  t.plan(8)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send('Get some light!')
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.body, '')
  })
})

test('Creates a HEAD route for a GET one with prefixTrailingSlash', async (t) => {
  t.plan(1)

  const fastify = Fastify()

  const arr = []
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', (routeOptions) => {
      arr.push(`${routeOptions.method} ${routeOptions.url}`)
    })

    instance.route({
      method: 'GET',
      path: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ here: 'is coffee' })
      }
    })

    next()
  }, { prefix: '/v1' })

  await fastify.ready()

  t.ok(true)
})

test('Will not create a HEAD route that is not GET', t => {
  t.plan(11)

  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send({ here: 'is coffee' })
    }
  })

  fastify.route({
    method: 'GET',
    path: '/some-light',
    handler: (req, reply) => {
      reply.send()
    }
  })

  fastify.route({
    method: 'POST',
    path: '/something',
    handler: (req, reply) => {
      reply.send({ look: 'It is something!' })
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/some-light'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
    t.equal(res.headers['content-length'], '0')
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/something'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('HEAD route should handle properly each response type', t => {
  t.plan(25)

  const fastify = Fastify({ exposeHeadRoutes: true })
  const resString = 'Found me!'
  const resJSON = { here: 'is Johnny' }
  const resBuffer = Buffer.from('I am a buffer!')
  const resStream = stream.Readable.from('I am a stream!')

  fastify.route({
    method: 'GET',
    path: '/json',
    handler: (req, reply) => {
      reply.send(resJSON)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/string',
    handler: (req, reply) => {
      reply.send(resString)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer',
    handler: (req, reply) => {
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/buffer-with-content-type',
    handler: (req, reply) => {
      reply.headers({ 'content-type': 'image/jpeg' })
      reply.send(resBuffer)
    }
  })

  fastify.route({
    method: 'GET',
    path: '/stream',
    handler: (req, reply) => {
      return resStream
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/json'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(JSON.stringify(resJSON))}`)
    t.same(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/string'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(resString)}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/buffer'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/buffer-with-content-type'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'image/jpeg')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/stream'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
    t.equal(res.headers['content-length'], undefined)
    t.equal(res.body, '')
  })
})

test('HEAD route should respect custom onSend handlers', t => {
  t.plan(6)

  let counter = 0
  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({ exposeHeadRoutes: true })
  const customOnSend = (res, reply, payload, done) => {
    counter = counter + 1
    done(null, payload)
  }

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: (req, reply) => {
      reply.send(resBuffer)
    },
    onSend: [customOnSend, customOnSend]
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counter, 2)
  })
})

test('route onSend can be function or array of functions', t => {
  t.plan(12)
  const counters = { single: 0, multiple: 0 }

  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({ exposeHeadRoutes: true })

  fastify.route({
    method: 'GET',
    path: '/coffee',
    handler: () => resBuffer,
    onSend: (res, reply, payload, done) => {
      counters.single += 1
      done(null, payload)
    }
  })

  const customOnSend = (res, reply, payload, done) => {
    counters.multiple += 1
    done(null, payload)
  }

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    handler: () => resBuffer,
    onSend: [customOnSend, customOnSend]
  })

  fastify.inject({ method: 'HEAD', url: '/coffee' }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counters.single, 1)
  })

  fastify.inject({ method: 'HEAD', url: '/more-coffee' }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
    t.equal(counters.multiple, 2)
  })
})

test('no warning for exposeHeadRoute', async t => {
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    exposeHeadRoute: true,
    async handler () {
      return 'hello world'
    }
  })

  const listener = (w) => {
    t.fail('no warning')
  }

  process.on('warning', listener)

  await fastify.listen({ port: 0 })

  process.removeListener('warning', listener)

  await fastify.close()
})

test("HEAD route should handle stream.on('error')", t => {
  t.plan(6)

  const resStream = stream.Readable.from('Hello with error!')
  const logStream = split(JSON.parse)
  const expectedError = new Error('Hello!')
  const fastify = Fastify({
    logger: {
      stream: logStream,
      level: 'error'
    }
  })

  fastify.route({
    method: 'GET',
    path: '/more-coffee',
    exposeHeadRoute: true,
    handler: (req, reply) => {
      process.nextTick(() => resStream.emit('error', expectedError))
      return resStream
    }
  })

  logStream.once('data', line => {
    const { message, stack } = expectedError
    t.same(line.err, { type: 'Error', message, stack })
    t.equal(line.msg, 'Error on Stream found for HEAD route')
    t.equal(line.level, 50)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/more-coffee'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], undefined)
  })
})

test('HEAD route should be exposed by default', t => {
  t.plan(7)

  const resStream = stream.Readable.from('Hello with error!')
  const resJson = { hello: 'world' }
  const fastify = Fastify()

  fastify.route({
    method: 'GET',
    path: '/without-flag',
    handler: (req, reply) => {
      return resStream
    }
  })

  fastify.route({
    exposeHeadRoute: true,
    method: 'GET',
    path: '/with-flag',
    handler: (req, reply) => {
      return resJson
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/without-flag'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
  })

  fastify.inject({
    method: 'HEAD',
    url: '/with-flag'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(res.headers['content-length'], `${Buffer.byteLength(JSON.stringify(resJson))}`)
    t.equal(res.body, '')
  })
})

test('HEAD route should be exposed if route exposeHeadRoute is set', t => {
  t.plan(7)

  const resBuffer = Buffer.from('I am a coffee!')
  const resJson = { hello: 'world' }
  const fastify = Fastify({ exposeHeadRoutes: false })

  fastify.route({
    exposeHeadRoute: true,
    method: 'GET',
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.route({
    method: 'GET',
    path: '/two',
    handler: (req, reply) => {
      return resJson
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/octet-stream')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.body, '')
  })

  fastify.inject({
    method: 'HEAD',
    url: '/two'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 404)
  })
})

test('Set a custom HEAD route before GET one without disabling exposeHeadRoutes (global)', t => {
  t.plan(6)

  const resBuffer = Buffer.from('I am a coffee!')
  const fastify = Fastify({
    exposeHeadRoutes: true
  })

  fastify.route({
    method: 'HEAD',
    path: '/one',
    handler: (req, reply) => {
      reply.header('content-type', 'application/pdf')
      reply.header('content-length', `${resBuffer.byteLength}`)
      reply.header('x-custom-header', 'some-custom-header')
      reply.send()
    }
  })

  fastify.route({
    method: 'GET',
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/pdf')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.headers['x-custom-header'], 'some-custom-header')
    t.equal(res.body, '')
  })
})

test('Set a custom HEAD route before GET one without disabling exposeHeadRoutes (route)', t => {
  t.plan(7)

  function onWarning (code) {
    t.equal(code, 'FSTDEP007')
  }
  const warning = {
    emit: onWarning
  }

  const route = proxyquire('../lib/route', { './warnings': warning })
  const fastify = proxyquire('..', { './lib/route.js': route })()

  const resBuffer = Buffer.from('I am a coffee!')

  fastify.route({
    method: 'HEAD',
    path: '/one',
    handler: (req, reply) => {
      reply.header('content-type', 'application/pdf')
      reply.header('content-length', `${resBuffer.byteLength}`)
      reply.header('x-custom-header', 'some-custom-header')
      reply.send()
    }
  })

  fastify.route({
    method: 'GET',
    exposeHeadRoute: true,
    path: '/one',
    handler: (req, reply) => {
      return resBuffer
    }
  })

  fastify.inject({
    method: 'HEAD',
    url: '/one'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['content-type'], 'application/pdf')
    t.equal(res.headers['content-length'], `${resBuffer.byteLength}`)
    t.equal(res.headers['x-custom-header'], 'some-custom-header')
    t.equal(res.body, '')
  })
})

test('HEAD routes properly auto created for GET routes when prefixTrailingSlash: \'no-slash\'', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(function routes (f, opts, next) {
    f.route({
      method: 'GET',
      url: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'no-slash',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  fastify.inject({ url: '/prefix/prefix', method: 'HEAD' }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('HEAD routes properly auto created for GET routes when prefixTrailingSlash: \'both\'', async t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(function routes (f, opts, next) {
    f.route({
      method: 'GET',
      url: '/',
      exposeHeadRoute: true,
      prefixTrailingSlash: 'both',
      handler: (req, reply) => {
        reply.send({ hello: 'world' })
      }
    })

    next()
  }, { prefix: '/prefix' })

  const doublePrefixReply = await fastify.inject({ url: '/prefix/prefix', method: 'HEAD' })
  const trailingSlashReply = await fastify.inject({ url: '/prefix/', method: 'HEAD' })
  const noneTrailingReply = await fastify.inject({ url: '/prefix', method: 'HEAD' })

  t.equal(doublePrefixReply.statusCode, 404)
  t.equal(trailingSlashReply.statusCode, 200)
  t.equal(noneTrailingReply.statusCode, 200)
})

test('Request and Reply share the route config', async t => {
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
      t.same(req.context, reply.context)
      t.same(req.context.config, reply.context.config)
      t.match(req.context.config, config, 'there are url and method additional properties')

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

test('GET route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: 'GET',
      path: '/get',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for GET:/get route is not supported!'))
})

test('HEAD route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: 'HEAD',
      path: '/shouldThrow',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for HEAD:/shouldThrow route is not supported!'))
})

test('[HEAD, GET] route with body schema should throw', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.route({
      method: ['HEAD', 'GET'],
      path: '/shouldThrowHead',
      schema: {
        body: {}
      },
      handler: function (req, reply) {
        reply.send({ hello: 'world' })
      }
    })
  }, new Error('Body validation schema for HEAD:/shouldThrowHead route is not supported!'))
})

test('GET route with body schema should throw - shorthand', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.get('/shouldThrow', {
      schema: {
        body: {}
      }
    },
    function (req, reply) {
      reply.send({ hello: 'world' })
    }
    )
  }, new Error('Body validation schema for GET:/shouldThrow route is not supported!'))
})

test('HEAD route with body schema should throw - shorthand', t => {
  t.plan(1)

  const fastify = Fastify()

  t.throws(() => {
    fastify.head('/shouldThrow2', {
      schema: {
        body: {}
      }
    },
    function (req, reply) {
      reply.send({ hello: 'world' })
    }
    )
  }, new Error('Body validation schema for HEAD:/shouldThrow2 route is not supported!'))
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
      url: getUrl(fastify) + encodeURI('/föö')
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
