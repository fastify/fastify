'use strict'

const test = require('tap').test
const Fastify = require('../')

function testHook (hook) {
  test(`${hook}`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, done) => {
        t.pass('hook called')
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

  test(`${hook} option should be called after ${hook} hook`, t => {
    t.plan(2)
    const fastify = Fastify()
    let check = ''

    fastify.addHook(hook, (req, reply, next) => {
      check = 'a'
      next()
    })

    fastify.post('/', {
      [hook]: (req, reply, done) => {
        check += 'b'
        done()
      }
    }, (req, reply) => {
      reply.send({ check })
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { check: 'ab' })
    })
  })

  test(`${hook} option should be unique per route`, t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, done) => {
        req.hello = 'earth'
        done()
      }
    }, (req, reply) => {
      reply.send({ hello: req.hello })
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

  test(`${hook} option should handle errors`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, done) => {
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

  test(`${hook} option should handle errors with custom status code`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, done) => {
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

  test(`${hook} option could accept an array of functions`, t => {
    t.plan(2)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: [
        (req, reply, done) => {
          req.aa = 'a'
          done()
        },
        (req, reply, done) => {
          req.aa += 'b'
          done()
        }
      ]
    }, (req, reply) => {
      reply.send({ aa: req.aa })
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { aa: 'ab' })
    })
  })

  test(`${hook} option does not interfere with ${hook} hook`, t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.addHook(hook, (req, reply, next) => {
      req.check = 'a'
      next()
    })

    fastify.post('/', {
      [hook]: (req, reply, done) => {
        req.check += 'b'
        done()
      }
    }, handler)

    fastify.post('/no', handler)

    function handler (req, reply) {
      reply.send({ check: req.check })
    }

    fastify.inject({
      method: 'post',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { check: 'ab' })
    })

    fastify.inject({
      method: 'post',
      url: '/no',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { check: 'a' })
    })
  })

  test(`${hook} option should keep the context`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.post('/', {
      [hook]: function (req, reply, done) {
        t.strictEqual(this.foo, 42)
        this.foo += 1
        done()
      }
    }, function (req, reply) {
      reply.send({ foo: this.foo })
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { foo: 43 })
    })
  })

  test(`${hook} option should keep the context (array)`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.post('/', {
      [hook]: [function (req, reply, done) {
        t.strictEqual(this.foo, 42)
        this.foo += 1
        done()
      }]
    }, function (req, reply) {
      reply.send({ foo: this.foo })
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      var payload = JSON.parse(res.payload)
      t.deepEqual(payload, { foo: 43 })
    })
  })
}

// hooks that comes before the handler
testHook('preHandler')
testHook('onRequest')
testHook('preValidation')
testHook('preParsing')

test('preHandler backwards compatibility with beforeHandler option (should emit a warning)', t => {
  t.plan(4)
  const fastify = Fastify()

  process.on('warning', warn => {
    t.strictEqual(
      warn.message,
      'The route option `beforeHandler` has been deprecated, use `preHandler` instead'
    )
    t.ok(warn.stack.indexOf(__filename) >= 0)
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

test('onRequest option should be called before preParsing', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', (req, reply, next) => {
    t.true(req.called)
    next()
  })

  fastify.post('/', {
    onRequest: (req, reply, done) => {
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
