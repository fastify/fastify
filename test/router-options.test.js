'use strict'

const test = require('tap').test
const sget = require('simple-get')
const Fastify = require('../')

test('Should honor ignoreTrailingSlash option', t => {
  t.plan(4)
  const fastify = Fastify({
    ignoreTrailingSlash: true
  })

  fastify.get('/test', (req, res) => {
    res.send('test')
  })

  fastify.listen(0, (err) => {
    fastify.server.unref()
    if (err) t.threw(err)

    const baseUrl = 'http://127.0.0.1:' + fastify.server.address().port

    sget.concat(baseUrl + '/test', (err, res, data) => {
      if (err) t.threw(err)
      t.is(res.statusCode, 200)
      t.is(data.toString(), 'test')
    })

    sget.concat(baseUrl + '/test/', (err, res, data) => {
      if (err) t.threw(err)
      t.is(res.statusCode, 200)
      t.is(data.toString(), 'test')
    })
  })
})

test('Should honor maxParamLength option', t => {
  t.plan(4)
  const fastify = Fastify({ maxParamLength: 10 })

  fastify.get('/test/:id', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/123456789abcd'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 404)
  })
})

test('preHandler', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
    preHandler: (req, reply, done) => {
      req.body.preHandler = true
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { preHandler: true, hello: 'world' })
  })
})

test('preHandler option should be called after preHandler hook', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    req.body.check = 'a'
    next()
  })

  fastify.post('/', {
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'ab', hello: 'world' })
  })
})

test('preHandler option should be unique per route', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
    preHandler: (req, reply, done) => {
      req.body.hello = 'earth'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'earth' })
  })

  fastify.inject({
    method: 'POST',
    url: '/no',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preHandler option should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preHandler: (req, reply, done) => {
      done(new Error('kaboom'))
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
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 500)
    t.deepEqual(payload, {
      message: 'kaboom',
      error: 'Internal Server Error',
      statusCode: 500
    })
  })
})

test('preHandler option should handle errors with custom status code', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preHandler: (req, reply, done) => {
      reply.code(401)
      done(new Error('go away'))
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
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 401)
    t.deepEqual(payload, {
      message: 'go away',
      error: 'Unauthorized',
      statusCode: 401
    })
  })
})

test('preHandler option could accept an array of functions', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.post('/', {
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
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { preHandler: 'ab', hello: 'world' })
  })
})

test('preHandler option does not interfere with preHandler hook', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    req.body.check = 'a'
    next()
  })

  fastify.post('/', {
    preHandler: (req, reply, done) => {
      req.body.check += 'b'
      done()
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'post',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'ab', hello: 'world' })
  })

  fastify.inject({
    method: 'post',
    url: '/no',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { check: 'a', hello: 'world' })
  })
})

test('preHandler option should keep the context', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.post('/', {
    preHandler: function (req, reply, done) {
      t.strictEqual(this.foo, 42)
      this.foo += 1
      req.body.foo = this.foo
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { foo: 43, hello: 'world' })
  })
})

test('preHandler option should keep the context (array)', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.post('/', {
    preHandler: [function (req, reply, done) {
      t.strictEqual(this.foo, 42)
      this.foo += 1
      req.body.foo = this.foo
      done()
    }]
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { foo: 43, hello: 'world' })
  })
})

test('Backwards compatibility with beforeHandler option (should emit a warning)', t => {
  t.plan(3)
  const fastify = Fastify()

  process.on('warning', warn => {
    t.strictEqual(
      warn.message,
      'The route option `beforeHandler` has been deprecated, use `preHandler` instead'
    )
  })

  fastify.post('/', {
    beforeHandler: (req, reply, done) => {
      req.body.preHandler = true
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { preHandler: true, hello: 'world' })
  })
})

test('preValidation option', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preValidation: (req, reply, done) => {
      req.preValidation = true
      done()
    }
  }, (req, reply) => {
    t.true(req.preValidation)
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preValidation option should be called before preHandler hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    t.true(req.called)
    next()
  })

  fastify.post('/', {
    preValidation: (req, reply, done) => {
      req.called = true
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preValidation option should be unique per route', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
    preValidation: (req, reply, done) => {
      req.hello = { hello: 'earth' }
      done()
    }
  }, (req, reply) => {
    reply.send(req.hello || req.body)
  })

  fastify.post('/no', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'earth' })
  })

  fastify.inject({
    method: 'POST',
    url: '/no',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preValidation option should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preValidation: (req, reply, done) => {
      done(new Error('kaboom'))
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
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 500)
    t.deepEqual(payload, {
      message: 'kaboom',
      error: 'Internal Server Error',
      statusCode: 500
    })
  })
})

test('preValidation option should handle errors with custom status code', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preValidation: (req, reply, done) => {
      reply.code(401)
      done(new Error('go away'))
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
    var payload = JSON.parse(res.payload)
    t.equal(res.statusCode, 401)
    t.deepEqual(payload, {
      message: 'go away',
      error: 'Unauthorized',
      statusCode: 401
    })
  })
})

test('preValidation option could accept an array of functions', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
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
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preValidation option should keep the context', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.post('/', {
    preValidation: function (req, reply, done) {
      t.strictEqual(this.foo, 42)
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preValidation option should keep the context (array)', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.decorate('foo', 42)

  fastify.post('/', {
    preValidation: [function (req, reply, done) {
      t.strictEqual(this.foo, 42)
      done()
    }]
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preSerialization option should be able to modify the payload', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/only', {
    preSerialization: (req, reply, payload, done) => {
      done(null, { hello: 'another world' })
    }
  }, (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/only'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'another world' })
  })
})

test('preSerialization option should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/only', {
    preSerialization: (req, reply, payload, done) => {
      reply.code(501)
      done(new Error('kaboom'))
    }
  }, (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/only'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 501)
    t.deepEqual(JSON.parse(res.payload), { message: 'kaboom', error: 'Not Implemented', statusCode: 501 })
  })
})

test('preSerialization option could accept an array of functions', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/only', {
    preSerialization: [
      (req, reply, payload, done) => {
        done(null, { hello: 'another world' })
      },
      (req, reply, payload, done) => {
        payload.hello += ', mate'
        done(null, payload)
      }
    ]
  }, (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/only'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'another world, mate' })
  })
})

test('preParsing option', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', {
    preParsing: (req, reply, done) => {
      req.preParsing = true
      done()
    }
  }, (req, reply) => {
    t.true(req.preParsing)
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preParsing option should be called before preValidation hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preValidation', (req, reply, next) => {
    t.true(req.called)
    next()
  })

  fastify.post('/', {
    preParsing: (req, reply, done) => {
      req.called = true
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
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('preParsing option could accept an array of functions', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', {
    preParsing: [function (req, reply, done) {
      t.ok('called')
      done()
    }, function (req, reply, done) {
      t.ok('called')
      done()
    }]
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    var payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})
