'use strict'

const t = require('tap')
const test = t.test
const fp = require('fastify-plugin')
const sget = require('simple-get').concat
const errors = require('http-errors')
const split = require('split2')
const FormData = require('form-data')
const Fastify = require('..')

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

test('default 404', t => {
  t.plan(5)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    test('unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify),
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      })
    })

    // Return 404 instead of 405 see https://github.com/fastify/fastify/pull/862 for discussion
    test('framework-unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify),
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      })
    })

    test('unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/notSupported',
        body: {},
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      })
    })

    test('using post method and multipart/formdata', t => {
      t.plan(3)
      const form = FormData()
      form.append('test-field', 'just some field')

      sget({
        method: 'POST',
        url: getUrl(fastify) + '/notSupported',
        body: form,
        json: false
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
      })
    })
  })
})

test('customized 404', t => {
  t.plan(6)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.get('/with-error', function (req, reply) {
    reply.send(new errors.NotFound())
  })

  fastify.get('/with-error-custom-header', function (req, reply) {
    const err = new errors.NotFound()
    err.headers = { 'x-foo': 'bar' }
    reply.send(err)
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    test('unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify),
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('framework-unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify),
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('with error object', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/with-error'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.same(JSON.parse(body), {
          error: 'Not Found',
          message: 'Not Found',
          statusCode: 404
        })
      })
    })

    test('error object with headers property', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/with-error-custom-header'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['x-foo'], 'bar')
        t.same(JSON.parse(body), {
          error: 'Not Found',
          message: 'Not Found',
          statusCode: 404
        })
      })
    })
  })
})

test('custom header in notFound handler', t => {
  t.plan(2)

  const test = t.test
  const fastify = Fastify()

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).header('x-foo', 'bar').send('this was not found')
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    test('not found with custom header', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(response.headers['x-foo'], 'bar')
        t.equal(body.toString(), 'this was not found')
      })
    })
  })
})

test('setting a custom 404 handler multiple times is an error', t => {
  t.plan(5)

  t.test('at the root level', t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.setNotFoundHandler(() => {})

    try {
      fastify.setNotFoundHandler(() => {})
      t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
    } catch (err) {
      t.type(err, Error)
      t.equal(err.message, 'Not found handler already set for Fastify instance with prefix: \'/\'')
    }
  })

  t.test('at the plugin level', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, done) => {
      instance.setNotFoundHandler(() => {})

      try {
        instance.setNotFoundHandler(() => {})
        t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
      } catch (err) {
        t.type(err, Error)
        t.equal(err.message, 'Not found handler already set for Fastify instance with prefix: \'/prefix\'')
      }

      done()
    }, { prefix: '/prefix' })

    fastify.listen({ port: 0 }, err => {
      t.error(err)
      fastify.close()
    })
  })

  t.test('at multiple levels', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, done) => {
      try {
        instance.setNotFoundHandler(() => {})
        t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
      } catch (err) {
        t.type(err, Error)
        t.equal(err.message, 'Not found handler already set for Fastify instance with prefix: \'/\'')
      }
      done()
    })

    fastify.setNotFoundHandler(() => {})

    fastify.listen({ port: 0 }, err => {
      t.error(err)
      fastify.close()
    })
  })

  t.test('at multiple levels / 2', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, done) => {
      instance.setNotFoundHandler(() => {})

      instance.register((instance2, options, done) => {
        try {
          instance2.setNotFoundHandler(() => {})
          t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
        } catch (err) {
          t.type(err, Error)
          t.equal(err.message, 'Not found handler already set for Fastify instance with prefix: \'/prefix\'')
        }
        done()
      })

      done()
    }, { prefix: '/prefix' })

    fastify.setNotFoundHandler(() => {})

    fastify.listen({ port: 0 }, err => {
      t.error(err)
      fastify.close()
    })
  })

  t.test('in separate plugins at the same level', t => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register((instance, options, done) => {
      instance.register((instance2A, options, done) => {
        instance2A.setNotFoundHandler(() => {})
        done()
      })

      instance.register((instance2B, options, done) => {
        try {
          instance2B.setNotFoundHandler(() => {})
          t.fail('setting multiple 404 handlers at the same prefix encapsulation level should throw')
        } catch (err) {
          t.type(err, Error)
          t.equal(err.message, 'Not found handler already set for Fastify instance with prefix: \'/prefix\'')
        }
        done()
      })

      done()
    }, { prefix: '/prefix' })

    fastify.setNotFoundHandler(() => {})

    fastify.listen({ port: 0 }, err => {
      t.error(err)
      fastify.close()
    })
  })
})

test('encapsulated 404', t => {
  t.plan(13)

  const test = t.test
  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  fastify.register(function (f, opts, done) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })
    done()
  }, { prefix: '/test' })

  fastify.register(function (f, opts, done) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 3')
    })
    done()
  }, { prefix: '/test2' })

  fastify.register(function (f, opts, done) {
    f.setNotFoundHandler(function (request, reply) {
      reply.code(404).send('this was not found 4')
    })
    done()
  }, { prefix: '/test3/' })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    test('root unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify),
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('root framework-unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify),
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('root unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found')
      })
    })

    test('unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify) + '/test',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 2')
      })
    })

    test('framework-unsupported method', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify) + '/test',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 2')
      })
    })

    test('unsupported route', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/test/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 2')
      })
    })

    test('unsupported method 2', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify) + '/test2',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 3')
      })
    })

    test('framework-unsupported method 2', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify) + '/test2',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 3')
      })
    })

    test('unsupported route 2', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/test2/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 3')
      })
    })

    test('unsupported method 3', t => {
      t.plan(3)
      sget({
        method: 'PUT',
        url: getUrl(fastify) + '/test3/',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 4')
      })
    })

    test('framework-unsupported method 3', t => {
      t.plan(3)
      sget({
        method: 'PROPFIND',
        url: getUrl(fastify) + '/test3/',
        body: JSON.stringify({ hello: 'world' }),
        headers: { 'Content-Type': 'application/json' }
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 4')
      })
    })

    test('unsupported route 3', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: getUrl(fastify) + '/test3/notSupported'
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 404)
        t.equal(body.toString(), 'this was not found 4')
      })
    })
  })
})

test('custom 404 hook and handler context', t => {
  t.plan(21)

  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.addHook('onRequest', function (req, res, done) {
    t.equal(this.foo, 42)
    done()
  })
  fastify.addHook('preHandler', function (request, reply, done) {
    t.equal(this.foo, 42)
    done()
  })
  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.equal(this.foo, 42)
    done()
  })
  fastify.addHook('onResponse', function (request, reply, done) {
    t.equal(this.foo, 42)
    done()
  })

  fastify.setNotFoundHandler(function (req, reply) {
    t.equal(this.foo, 42)
    reply.code(404).send('this was not found')
  })

  fastify.register(function (instance, opts, done) {
    instance.decorate('bar', 84)

    instance.addHook('onRequest', function (req, res, done) {
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('preHandler', function (request, reply, done) {
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('onResponse', function (request, reply, done) {
      t.equal(this.bar, 84)
      done()
    })

    instance.setNotFoundHandler(function (req, reply) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      reply.code(404).send('encapsulated was not found')
    })

    done()
  }, { prefix: '/encapsulated' })

  fastify.inject('/not-found', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'this was not found')
  })

  fastify.inject('/encapsulated/not-found', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'encapsulated was not found')
  })
})

test('encapsulated custom 404 without - prefix hook and handler context', t => {
  t.plan(13)

  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.register(function (instance, opts, done) {
    instance.decorate('bar', 84)

    instance.addHook('onRequest', function (req, res, done) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('preHandler', function (request, reply, done) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('onSend', function (request, reply, payload, done) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      done()
    })
    instance.addHook('onResponse', function (request, reply, done) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      done()
    })

    instance.setNotFoundHandler(function (request, reply) {
      t.equal(this.foo, 42)
      t.equal(this.bar, 84)
      reply.code(404).send('custom not found')
    })

    done()
  })

  fastify.inject('/not-found', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'custom not found')
  })
})

test('run hooks on default 404', t => {
  t.plan(7)

  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, res, done) {
    t.pass('onRequest called')
    done()
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    t.pass('preHandler called')
    done()
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.pass('onSend called')
    done()
  })

  fastify.addHook('onResponse', function (request, reply, done) {
    t.pass('onResponse called')
    done()
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: getUrl(fastify),
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('run non-encapsulated plugin hooks on default 404', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.register(fp(function (instance, options, done) {
    instance.addHook('onRequest', function (req, res, done) {
      t.pass('onRequest called')
      done()
    })

    instance.addHook('preHandler', function (request, reply, done) {
      t.pass('preHandler called')
      done()
    })

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.pass('onSend called')
      done()
    })

    instance.addHook('onResponse', function (request, reply, done) {
      t.pass('onResponse called')
      done()
    })

    done()
  }))

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

test('run non-encapsulated plugin hooks on custom 404', t => {
  t.plan(11)

  const fastify = Fastify()

  const plugin = fp((instance, opts, done) => {
    instance.addHook('onRequest', function (req, res, done) {
      t.pass('onRequest called')
      done()
    })

    instance.addHook('preHandler', function (request, reply, done) {
      t.pass('preHandler called')
      done()
    })

    instance.addHook('onSend', function (request, reply, payload, done) {
      t.pass('onSend called')
      done()
    })

    instance.addHook('onResponse', function (request, reply, done) {
      t.pass('onResponse called')
      done()
    })

    done()
  })

  fastify.register(plugin)

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.code(404).send('this was not found')
  })

  fastify.register(plugin) // Registering plugin after handler also works

  fastify.inject({ url: '/not-found' }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'this was not found')
  })
})

test('run hook with encapsulated 404', t => {
  t.plan(11)

  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, res, done) {
    t.pass('onRequest called')
    done()
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    t.pass('preHandler called')
    done()
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.pass('onSend called')
    done()
  })

  fastify.addHook('onResponse', function (request, reply, done) {
    t.pass('onResponse called')
    done()
  })

  fastify.register(function (f, opts, done) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })

    f.addHook('onRequest', function (req, res, done) {
      t.pass('onRequest 2 called')
      done()
    })

    f.addHook('preHandler', function (request, reply, done) {
      t.pass('preHandler 2 called')
      done()
    })

    f.addHook('onSend', function (request, reply, payload, done) {
      t.pass('onSend 2 called')
      done()
    })

    f.addHook('onResponse', function (request, reply, done) {
      t.pass('onResponse 2 called')
      done()
    })

    done()
  }, { prefix: '/test' })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: getUrl(fastify) + '/test',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('run hook with encapsulated 404 and framework-unsupported method', t => {
  t.plan(11)

  const fastify = Fastify()

  fastify.addHook('onRequest', function (req, res, done) {
    t.pass('onRequest called')
    done()
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    t.pass('preHandler called')
    done()
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    t.pass('onSend called')
    done()
  })

  fastify.addHook('onResponse', function (request, reply, done) {
    t.pass('onResponse called')
    done()
  })

  fastify.register(function (f, opts, done) {
    f.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found 2')
    })

    f.addHook('onRequest', function (req, res, done) {
      t.pass('onRequest 2 called')
      done()
    })

    f.addHook('preHandler', function (request, reply, done) {
      t.pass('preHandler 2 called')
      done()
    })

    f.addHook('onSend', function (request, reply, payload, done) {
      t.pass('onSend 2 called')
      done()
    })

    f.addHook('onResponse', function (request, reply, done) {
      t.pass('onResponse 2 called')
      done()
    })

    done()
  }, { prefix: '/test' })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'PROPFIND',
      url: getUrl(fastify) + '/test',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('hooks check 404', t => {
  t.plan(13)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', (req, reply, payload, done) => {
    t.same(req.query, { foo: 'asd' })
    t.ok('called', 'onSend')
    done()
  })
  fastify.addHook('onRequest', (req, res, done) => {
    t.ok('called', 'onRequest')
    done()
  })
  fastify.addHook('onResponse', (request, reply, done) => {
    t.ok('called', 'onResponse')
    done()
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'PUT',
      url: getUrl(fastify) + '?foo=asd',
      body: JSON.stringify({ hello: 'world' }),
      headers: { 'Content-Type': 'application/json' }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })

    sget({
      method: 'GET',
      url: getUrl(fastify) + '/notSupported?foo=asd'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('setNotFoundHandler should not suppress duplicated routes checking', t => {
  t.plan(1)

  const fastify = Fastify()

  try {
    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' })
    })
    fastify.get('/', function (req, reply) {
      reply.send({ hello: 'world' })
    })
    fastify.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found')
    })

    t.fail('setNotFoundHandler should not interfere duplicated route error')
  } catch (error) {
    t.ok(error)
  }
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

  t.teardown(fastify.close.bind(fastify))

  t.test('log debug', t => {
    t.plan(7)
    fastify.inject({
      method: 'GET',
      url: '/not-found'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)

      const INFO_LEVEL = 30
      t.equal(JSON.parse(logStream.logs[0]).msg, 'incoming request')
      t.equal(JSON.parse(logStream.logs[1]).msg, 'Route GET:/not-found not found')
      t.equal(JSON.parse(logStream.logs[1]).level, INFO_LEVEL)
      t.equal(JSON.parse(logStream.logs[2]).msg, 'request completed')
      t.equal(logStream.logs.length, 3)
    })
  })
})

test('Unknown method', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    const handler = () => {}
    // See https://github.com/fastify/light-my-request/pull/20
    t.throws(() => fastify.inject({
      method: 'UNKNWON_METHOD',
      url: '/'
    }, handler), Error)

    sget({
      method: 'UNKNWON_METHOD',
      url: getUrl(fastify)
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.strictSame(JSON.parse(body), {
        error: 'Bad Request',
        message: 'Client Error',
        statusCode: 400
      })
    })
  })
})

test('recognizes errors from the http-errors module', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send(new errors.NotFound())
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 404)

      sget(getUrl(fastify), (err, response, body) => {
        t.error(err)
        const obj = JSON.parse(body.toString())
        t.strictSame(obj, {
          error: 'Not Found',
          message: 'Not Found',
          statusCode: 404
        })
      })
    })
  })
})

test('the default 404 handler can be invoked inside a prefixed plugin', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.get('/path', function (request, reply) {
      reply.send(new errors.NotFound())
    })

    done()
  }, { prefix: '/v1' })

  fastify.inject('/v1/path', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.strictSame(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404
    })
  })
})

test('an inherited custom 404 handler can be invoked inside a prefixed plugin', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.setNotFoundHandler(function (request, reply) {
    reply.code(404).send('custom handler')
  })

  fastify.register(function (instance, opts, done) {
    instance.get('/path', function (request, reply) {
      reply.send(new errors.NotFound())
    })

    done()
  }, { prefix: '/v1' })

  fastify.inject('/v1/path', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.same(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404
    })
  })
})

test('encapsulated custom 404 handler without a prefix is the handler for the entire 404 level', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.register(function (instance, opts, done) {
    instance.setNotFoundHandler(function (request, reply) {
      reply.code(404).send('custom handler')
    })

    done()
  })

  fastify.register(function (instance, opts, done) {
    instance.register(function (instance2, opts, done) {
      instance2.setNotFoundHandler(function (request, reply) {
        reply.code(404).send('custom handler 2')
      })
      done()
    })

    done()
  }, { prefix: 'prefixed' })

  fastify.inject('/not-found', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'custom handler')
  })

  fastify.inject('/prefixed/not-found', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'custom handler 2')
  })
})

test('cannot set notFoundHandler after binding', t => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
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

  let called = false

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.addHook('onSend', function (request, reply, payload, done) {
    if (!called) {
      called = true
      done(new errors.NotFound())
    } else {
      done()
    }
  })

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: getUrl(fastify)
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

// https://github.com/fastify/fastify/issues/868
test('onSend hooks run when an encapsulated route invokes the notFound handler', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, options, done) => {
    instance.addHook('onSend', (request, reply, payload, done) => {
      t.pass('onSend hook called')
      done()
    })

    instance.get('/', (request, reply) => {
      reply.send(new errors.NotFound())
    })

    done()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
  })
})

// https://github.com/fastify/fastify/issues/713
test('preHandler option for setNotFoundHandler', t => {
  t.plan(10)

  t.test('preHandler option', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.preHandler = true
        done()
      }
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { preHandler: true, hello: 'world' })
    })
  })

  // https://github.com/fastify/fastify/issues/2229
  t.test('preHandler hook in setNotFoundHandler should be called when callNotFound', { timeout: 40000 }, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.preHandler = true
        done()
      }
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.post('/', function (req, reply) {
      t.equal(reply.callNotFound(), reply)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { preHandler: true, hello: 'world' })
    })
  })

  t.test('preHandler hook in setNotFoundHandler should accept an array of functions and be called when callNotFound', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: [
        (req, reply, done) => {
          req.body.preHandler1 = true
          done()
        },
        (req, reply, done) => {
          req.body.preHandler2 = true
          done()
        }
      ]
    }, function (req, reply) {
      reply.code(404).send(req.body)
    })

    fastify.post('/', function (req, reply) {
      reply.callNotFound()
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { preHandler1: true, preHandler2: true, hello: 'world' })
    })
  })

  t.test('preHandler option should be called after preHandler hook', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.addHook('preHandler', (req, reply, done) => {
      req.body.check = 'a'
      done()
    })

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.check += 'b'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { check: 'ab', hello: 'world' })
    })
  })

  t.test('preHandler option should be unique per prefix', t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.hello = 'earth'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.register(function (i, o, n) {
      i.setNotFoundHandler((req, reply) => {
        reply.send(req.body)
      })

      n()
    }, { prefix: '/no' })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { hello: 'earth' })
    })

    fastify.inject({
      method: 'POST',
      url: '/no/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { hello: 'world' })
    })
  })

  t.test('preHandler option should handle errors', t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        done(new Error('kaboom'))
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(res.statusCode, 500)
      t.same(payload, {
        message: 'kaboom',
        error: 'Internal Server Error',
        statusCode: 500
      })
    })
  })

  t.test('preHandler option should handle errors with custom status code', t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        reply.code(401)
        done(new Error('go away'))
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.equal(res.statusCode, 401)
      t.same(payload, {
        message: 'go away',
        error: 'Unauthorized',
        statusCode: 401
      })
    })
  })

  t.test('preHandler option could accept an array of functions', t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.setNotFoundHandler({
      preHandler: [
        (req, reply, done) => {
          req.body.preHandler = 'a'
          done()
        },
        (req, reply, done) => {
          req.body.preHandler += 'b'
          done()
        }
      ]
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { preHandler: 'ab', hello: 'world' })
    })
  })

  t.test('preHandler option does not interfere with preHandler', t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.addHook('preHandler', (req, reply, done) => {
      req.body.check = 'a'
      done()
    })

    fastify.setNotFoundHandler({
      preHandler: (req, reply, done) => {
        req.body.check += 'b'
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.register(function (i, o, n) {
      i.setNotFoundHandler((req, reply) => {
        reply.send(req.body)
      })

      n()
    }, { prefix: '/no' })

    fastify.inject({
      method: 'post',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { check: 'ab', hello: 'world' })
    })

    fastify.inject({
      method: 'post',
      url: '/no/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { check: 'a', hello: 'world' })
    })
  })

  t.test('preHandler option should keep the context', t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.setNotFoundHandler({
      preHandler: function (req, reply, done) {
        t.equal(this.foo, 42)
        this.foo += 1
        req.body.foo = this.foo
        done()
      }
    }, (req, reply) => {
      reply.send(req.body)
    })

    fastify.inject({
      method: 'POST',
      url: '/not-found',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { foo: 43, hello: 'world' })
    })
  })
})

test('reply.notFound invoked the notFound handler', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send(new Error('kaboom'))
  })

  fastify.get('/', function (req, reply) {
    reply.callNotFound()
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.same(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'kaboom',
      statusCode: 404
    })
  })
})

test('The custom error handler should be invoked after the custom not found handler', t => {
  t.plan(6)

  const fastify = Fastify()
  const order = [1, 2]

  fastify.setErrorHandler((err, req, reply) => {
    t.equal(order.shift(), 2)
    t.type(err, Error)
    reply.send(err)
  })

  fastify.setNotFoundHandler((req, reply) => {
    t.equal(order.shift(), 1)
    reply.code(404).send(new Error('kaboom'))
  })

  fastify.get('/', function (req, reply) {
    reply.callNotFound()
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.same(JSON.parse(res.payload), {
      error: 'Not Found',
      message: 'kaboom',
      statusCode: 404
    })
  })
})

test('If the custom not found handler does not use an Error, the custom error handler should not be called', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.setErrorHandler((_err, req, reply) => {
    t.fail('Should not be called')
  })

  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send('kaboom')
  })

  fastify.get('/', function (req, reply) {
    reply.callNotFound()
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, 'kaboom')
  })
})

test('preValidation option', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', true)

  fastify.setNotFoundHandler({
    preValidation: function (req, reply, done) {
      t.ok(this.foo)
      done()
    }
  }, function (req, reply) {
    reply.code(404).send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/not-found',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

t.test('preValidation option could accept an array of functions', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.setNotFoundHandler({
    preValidation: [
      (req, reply, done) => {
        t.ok('called')
        done()
      },
      (req, reply, done) => {
        t.ok('called')
        done()
      }
    ]
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/not-found',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('Should fail to invoke callNotFound inside a 404 handler', t => {
  t.plan(5)

  let fastify = null
  const logStream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: logStream,
        level: 'warn'
      }
    })
  } catch (e) {
    t.fail()
  }

  fastify.setNotFoundHandler((req, reply) => {
    reply.callNotFound()
  })

  fastify.get('/', function (req, reply) {
    reply.callNotFound()
  })

  logStream.once('data', line => {
    t.equal(line.msg, 'Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
    t.equal(line.level, 40)
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.equal(res.payload, '404 Not Found')
  })
})

test('400 in case of bad url (pre find-my-way v2.2.0 was a 404)', t => {
  t.test('Dynamic route', t => {
    t.plan(3)
    const fastify = Fastify()
    fastify.get('/hello/:id', () => t.fail('we should not be here'))
    fastify.inject({
      url: '/hello/%world',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: "'/hello/%world' is not a valid url component",
        statusCode: 400,
        code: 'FST_ERR_BAD_URL'
      })
    })
  })

  t.test('Wildcard', t => {
    t.plan(3)
    const fastify = Fastify()
    fastify.get('*', () => t.fail('we should not be here'))
    fastify.inject({
      url: '/hello/%world',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 400)
      t.same(JSON.parse(response.payload), {
        error: 'Bad Request',
        message: "'/hello/%world' is not a valid url component",
        statusCode: 400,
        code: 'FST_ERR_BAD_URL'
      })
    })
  })

  t.test('No route registered', t => {
    t.plan(3)
    const fastify = Fastify()
    fastify.inject({
      url: '/%c0',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.same(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'Route GET:/%c0 not found',
        statusCode: 404
      })
    })
  })

  t.test('Only / is registered', t => {
    t.plan(3)
    const fastify = Fastify()
    fastify.get('/', () => t.fail('we should not be here'))
    fastify.inject({
      url: '/non-existing',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.same(JSON.parse(response.payload), {
        error: 'Not Found',
        message: 'Route GET:/non-existing not found',
        statusCode: 404
      })
    })
  })

  t.test('customized 404', t => {
    t.plan(3)
    const fastify = Fastify({ logger: true })
    fastify.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('this was not found')
    })
    fastify.inject({
      url: '/%c0',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.same(response.payload, 'this was not found')
    })
  })

  t.end()
})

test('setNotFoundHandler should be chaining fastify instance', t => {
  t.test('Register route after setNotFoundHandler', t => {
    t.plan(6)
    const fastify = Fastify()
    fastify.setNotFoundHandler(function (_req, reply) {
      reply.code(404).send('this was not found')
    }).get('/valid-route', function (_req, reply) {
      reply.send('valid route')
    })

    fastify.inject({
      url: '/invalid-route',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.equal(response.payload, 'this was not found')
    })

    fastify.inject({
      url: '/valid-route',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.payload, 'valid route')
    })
  })

  t.end()
})

test('Send 404 when frameworkError calls reply.callNotFound', t => {
  t.test('Dynamic route', t => {
    t.plan(4)
    const fastify = Fastify({
      frameworkErrors: (error, req, reply) => {
        t.equal(error.message, "'/hello/%world' is not a valid url component")
        return reply.callNotFound()
      }
    })
    fastify.get('/hello/:id', () => t.fail('we should not be here'))
    fastify.inject({
      url: '/hello/%world',
      method: 'GET'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 404)
      t.equal(response.payload, '404 Not Found')
    })
  })

  t.end()
})

test('hooks are applied to not found handlers /1', async ({ equal }) => {
  const fastify = Fastify()

  // adding await here is fundamental for this test
  await fastify.register(async function (fastify) {
  })

  fastify.setErrorHandler(function (_, request, reply) {
    return reply.code(401).send({ error: 'Unauthorized' })
  })

  fastify.addHook('preValidation', async function (request, reply) {
    throw new Error('kaboom')
  })

  const { statusCode } = await fastify.inject('/')
  equal(statusCode, 401)
})

test('hooks are applied to not found handlers /2', async ({ equal }) => {
  const fastify = Fastify()

  async function plugin (fastify) {
    fastify.setErrorHandler(function (_, request, reply) {
      return reply.code(401).send({ error: 'Unauthorized' })
    })
  }

  plugin[Symbol.for('skip-override')] = true

  fastify.register(plugin)

  fastify.addHook('preValidation', async function (request, reply) {
    throw new Error('kaboom')
  })

  const { statusCode } = await fastify.inject('/')
  equal(statusCode, 401)
})

test('hooks are applied to not found handlers /3', async ({ equal, fail }) => {
  const fastify = Fastify()

  async function plugin (fastify) {
    fastify.setNotFoundHandler({ errorHandler }, async () => {
      fail('this should never be called')
    })

    function errorHandler (_, request, reply) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  }

  plugin[Symbol.for('skip-override')] = true

  fastify.register(plugin)

  fastify.addHook('preValidation', async function (request, reply) {
    throw new Error('kaboom')
  })

  const { statusCode } = await fastify.inject('/')
  equal(statusCode, 401)
})
