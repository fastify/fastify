'use strict'

const t = require('tap')
const test = t.test
const fp = require('fastify-plugin')
const httpErrors = require('http-errors')
const sget = require('simple-get').concat
const errors = require('http-errors')
const Fastify = require('..')

test('default 404', t => {
  t.plan(3)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    test('unsupported method', t => {
      t.plan(2)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port,
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })

    test('unsupported route', t => {
      t.plan(2)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/notSupported',
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })
  })
})

test('customized 404', t => {
  t.plan(4)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.get('/with-error', function (req, reply) {
    reply.send(new errors.NotFound())
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    test('unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port,
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found')
      })
    })

    test('unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found')
      })
    })

    test('with error object', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/with-error'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found')
      })
    })
  })
})

test('setting a custom 404 handler multiple times is an error', t => {
  t.plan(4)

  t.test('at the root level', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.setNotFoundHandler(() => {})

    try {
      fastify.setNotFoundHandler(() => {})
      t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
    } catch (err) {
      t.type(err, Error)
      t.strictEqual(err.message, 'Not found handler already set for Fastify instance with prefix: \'/\'')
    }
  })

  t.test('at the plugin level', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, next) => {
      instance.setNotFoundHandler(() => {})

      try {
        instance.setNotFoundHandler(() => {})
        t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
      } catch (err) {
        t.type(err, Error)
        t.strictEqual(err.message, 'Not found handler already set for Fastify instance with prefix: \'/prefix\'')
      }

      next()
    }, { prefix: '/prefix' })

    fastify.listen(0, err => {
      t.error(err)
      fastify.close()
    })
  })

  t.test('at multiple levels', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, next) => {
      try {
        instance.setNotFoundHandler(() => {})
        t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
      } catch (err) {
        t.type(err, Error)
        t.strictEqual(err.message, 'Not found handler already set for Fastify instance with prefix: \'/\'')
      }
      next()
    })

    fastify.setNotFoundHandler(() => {})

    fastify.listen(0, err => {
      t.error(err)
      fastify.close()
    })
  })

  t.test('at multiple levels / 2', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, next) => {
      instance.setNotFoundHandler(() => {})

      instance.register((instance2, options, next) => {
        try {
          instance2.setNotFoundHandler(() => {})
          t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
        } catch (err) {
          t.type(err, Error)
          t.strictEqual(err.message, 'Not found handler already set for Fastify instance with prefix: \'/prefix\'')
        }
        next()
      })

      next()
    }, { prefix: '/prefix' })

    fastify.setNotFoundHandler(() => {})

    fastify.listen(0, err => {
      t.error(err)
      fastify.close()
    })
  })
})

test('encapsulated 404', t => {
  t.plan(9)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  fastify.register(function (f, opts, next) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })
    next()
  }, { prefix: '/test' })

  fastify.register(function (f, opts, next) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 3')
    })
    next()
  }, { prefix: '/test2' })

  fastify.register(function (f, opts, next) {
    f.setNotFoundHandler(function (request, reply) {
      reply.code(404).send('this was not found 4')
    })
    next()
  }, { prefix: '/test3/' })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    test('root unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port,
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found')
      })
    })

    test('root insupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found')
      })
    })

    test('unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port + '/test',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 2')
      })
    })

    test('unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/test/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 2')
      })
    })

    test('unsupported method bis', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port + '/test2',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 3')
      })
    })

    test('unsupported route bis', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/test2/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 3')
      })
    })

    test('unsupported method 3', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: 'http://localhost:' + fastify.server.address().port + '/test3/',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 4')
      })
    })

    test('unsupported route 3', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/test3/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
        t.strictEqual(body.toString(), 'this was not found 4')
      })
    })
  })
})

test('custom 404 hook and handler context', t => {
  t.plan(21)

  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.addHook('onRequest', function (req, res, next) {
    t.strictEqual(this.foo, 42)
    next()
  })
  fastify.addHook('preHandler', function (request, reply, next) {
    t.strictEqual(this.foo, 42)
    next()
  })
  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.strictEqual(this.foo, 42)
    next()
  })
  fastify.addHook('onResponse', function (res, next) {
    t.strictEqual(this.foo, 42)
    next()
  })

  fastify.setNotFoundHandler(function (req, reply) {
    t.strictEqual(this.foo, 42)
    reply.code(404).send('this was not found')
  })

  fastify.register(function (instance, opts, next) {
    instance.decorate('bar', 84)

    instance.addHook('onRequest', function (req, res, next) {
      t.strictEqual(this.bar, 84)
      next()
    })
    instance.addHook('preHandler', function (request, reply, next) {
      t.strictEqual(this.bar, 84)
      next()
    })
    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(this.bar, 84)
      next()
    })
    instance.addHook('onResponse', function (res, next) {
      t.strictEqual(this.bar, 84)
      next()
    })

    instance.setNotFoundHandler(function (req, reply) {
      t.strictEqual(this.foo, 42)
      t.strictEqual(this.bar, 84)
      reply.code(404).send('encapsulated was not found')
    })

    next()
  }, { prefix: '/encapsulated' })

  fastify.inject('/not-found', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
    t.strictEqual(res.payload, 'this was not found')
  })

  fastify.inject('/encapsulated/not-found', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
    t.strictEqual(res.payload, 'encapsulated was not found')
  })
})

test('run hooks and middleware on default 404', t => {
  t.plan(8)

  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, res, next) {
    t.pass('onRequest called')
    next()
  })

  fastify.use(function (req, res, next) {
    t.pass('middleware called')
    next()
  })

  fastify.addHook('preHandler', function (request, reply, next) {
    t.pass('preHandler called')
    next()
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.pass('onSend called')
    next()
  })

  fastify.addHook('onResponse', function (res, next) {
    t.pass('onResponse called')
    next()
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: 'http://localhost:' + fastify.server.address().port,
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('run non-encapsulated plugin hooks and middleware on custom 404', t => {
  t.plan(8)

  const fastify = Fastify()

  const plugin = fp((instance, opts, next) => {
    instance.addHook('onRequest', function (req, res, next) {
      t.pass('onRequest called')
      next()
    })

    instance.use(function (req, res, next) {
      t.pass('middleware called')
      next()
    })

    instance.addHook('preHandler', function (request, reply, next) {
      t.pass('preHandler called')
      next()
    })

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.pass('onSend called')
      next()
    })

    instance.addHook('onResponse', function (res, next) {
      t.pass('onResponse called')
      next()
    })

    next()
  })
  fastify.register(plugin)

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  fastify.inject({url: '/not-found'}, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
    t.strictEqual(res.payload, 'this was not found')
  })
})

test('run hooks and middleware with encapsulated 404', t => {
  t.plan(13)

  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, res, next) {
    t.pass('onRequest called')
    next()
  })

  fastify.use(function (req, res, next) {
    t.pass('middleware called')
    next()
  })

  fastify.addHook('preHandler', function (request, reply, next) {
    t.pass('preHandler called')
    next()
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.pass('onSend called')
    next()
  })

  fastify.addHook('onResponse', function (res, next) {
    t.pass('onResponse called')
    next()
  })

  fastify.register(function (f, opts, next) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })

    f.addHook('onRequest', function (req, res, next) {
      t.pass('onRequest 2 called')
      next()
    })

    f.use(function (req, res, next) {
      t.pass('middleware 2 called')
      next()
    })

    f.addHook('preHandler', function (request, reply, next) {
      t.pass('preHandler 2 called')
      next()
    })

    f.addHook('onSend', function (request, reply, payload, next) {
      t.pass('onSend 2 called')
      next()
    })

    f.addHook('onResponse', function (res, next) {
      t.pass('onResponse 2 called')
      next()
    })

    next()
  }, { prefix: '/test' })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: 'http://localhost:' + fastify.server.address().port + '/test',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('run middlewares on default 404', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.use(function (req, res, next) {
    t.pass('middleware called')
    next()
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: 'http://localhost:' + fastify.server.address().port,
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('run middlewares with encapsulated 404', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.use(function (req, res, next) {
    t.pass('middleware called')
    next()
  })

  fastify.register(function (f, opts, next) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })

    f.use(function (req, res, next) {
      t.pass('middleware 2 called')
      next()
    })

    next()
  }, { prefix: '/test' })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: 'http://localhost:' + fastify.server.address().port + '/test',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('hooks check 404', t => {
  t.plan(13)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.deepEqual(req.query, { foo: 'asd' })
    t.ok('called', 'onSend')
    next()
  })
  fastify.addHook('onRequest', (req, res, next) => {
    t.ok('called', 'onRequest')
    next()
  })
  fastify.addHook('onResponse', (res, next) => {
    t.ok('called', 'onResponse')
    next()
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: 'http://localhost:' + fastify.server.address().port + '?foo=asd',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/notSupported?foo=asd'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('setNotFoundHandler should not suppress duplicated routes checking', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  fastify.listen(0, err => {
    t.ok(err)
  })
})

test('log debug for 404', t => {
  t.plan(1)

  const Writable = require('stream').Writable

  const logStream = new Writable()
  logStream.logs = []
  logStream._write = function (chunk, encoding, callback) {
    this.logs.push(chunk.toString())
    callback()
  }

  const fastify = Fastify({
    logger: {
      level: 'trace',
      stream: logStream
    }
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  t.test('log debug', t => {
    t.plan(7)
    fastify.inject({
      method: 'GET',
      url: '/not-found'
    }, (err, response) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)

      const INFO_LEVEL = 30
      t.strictEqual(JSON.parse(logStream.logs[0]).msg, 'incoming request')
      t.strictEqual(JSON.parse(logStream.logs[1]).msg, 'Not found')
      t.strictEqual(JSON.parse(logStream.logs[1]).level, INFO_LEVEL)
      t.strictEqual(JSON.parse(logStream.logs[2]).msg, 'request completed')
      t.strictEqual(logStream.logs.length, 3)
    })
  })
})

test('Unsupported method', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'PROPFIND',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 404)

      sget({
        method: 'PROPFIND',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 404)
      })
    })
  })
})

test('recognizes errors from the http-errors module', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(httpErrors.NotFound())
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.statusCode, 404)

      sget('http://localhost:' + fastify.server.address().port, (err, response, body) => {
        t.error(err)
        const obj = JSON.parse(body.toString())
        t.strictDeepEqual(obj, {
          error: 'Not Found',
          message: 'Not found',
          statusCode: 404
        })
      })
    })
  })
})

test('cannot set notFoundHandler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    try {
      fastify.setNotFoundHandler(() => { })
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('404 inside onSend', t => {
  t.plan(3)

  const fastify = Fastify()

  var called = false

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    if (!called) {
      called = true
      next(new errors.NotFound())
    } else {
      next()
    }
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})
