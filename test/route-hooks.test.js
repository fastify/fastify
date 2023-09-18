'use strict'

const { Readable } = require('node:stream')
const test = require('tap').test
const sget = require('simple-get').concat
const Fastify = require('../')

process.removeAllListeners('warning')

function endRouteHook (doneOrPayload, done, doneValue) {
  if (typeof doneOrPayload === 'function') {
    doneOrPayload(doneValue)
  } else {
    done(doneValue)
  }
}

function testExecutionHook (hook) {
  test(`${hook}`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        t.pass('hook called')
        endRouteHook(doneOrPayload, done)
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
      t.same(payload, { hello: 'world' })
    })
  })

  test(`${hook} option should be called after ${hook} hook`, t => {
    t.plan(3)
    const fastify = Fastify()
    const checker = Object.defineProperty({ calledTimes: 0 }, 'check', {
      get: function () { return ++this.calledTimes }
    })

    fastify.addHook(hook, (req, reply, doneOrPayload, done) => {
      t.equal(checker.check, 1)
      endRouteHook(doneOrPayload, done)
    })

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        t.equal(checker.check, 2)
        endRouteHook(doneOrPayload, done)
      }
    }, (req, reply) => {
      reply.send({})
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
    })
  })

  test(`${hook} option could accept an array of functions`, t => {
    t.plan(3)
    const fastify = Fastify()
    const checker = Object.defineProperty({ calledTimes: 0 }, 'check', {
      get: function () { return ++this.calledTimes }
    })

    fastify.post('/', {
      [hook]: [
        (req, reply, doneOrPayload, done) => {
          t.equal(checker.check, 1)
          endRouteHook(doneOrPayload, done)
        },
        (req, reply, doneOrPayload, done) => {
          t.equal(checker.check, 2)
          endRouteHook(doneOrPayload, done)
        }
      ]
    }, (req, reply) => {
      reply.send({})
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
    })
  })

  test(`${hook} option could accept an array of async functions`, t => {
    t.plan(3)
    const fastify = Fastify()
    const checker = Object.defineProperty({ calledTimes: 0 }, 'check', {
      get: function () { return ++this.calledTimes }
    })

    fastify.post('/', {
      [hook]: [
        async (req, reply) => {
          t.equal(checker.check, 1)
        },
        async (req, reply) => {
          t.equal(checker.check, 2)
        }
      ]
    }, (req, reply) => {
      reply.send({})
    })

    fastify.inject({
      method: 'POST',
      url: '/',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
    })
  })

  test(`${hook} option does not interfere with ${hook} hook`, t => {
    t.plan(7)
    const fastify = Fastify()
    const checker = Object.defineProperty({ calledTimes: 0 }, 'check', {
      get: function () { return ++this.calledTimes }
    })

    fastify.addHook(hook, (req, reply, doneOrPayload, done) => {
      t.equal(checker.check, 1)
      endRouteHook(doneOrPayload, done)
    })

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        t.equal(checker.check, 2)
        endRouteHook(doneOrPayload, done)
      }
    }, handler)

    fastify.post('/no', handler)

    function handler (req, reply) {
      reply.send({})
    }

    fastify.inject({
      method: 'post',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.equal(checker.calledTimes, 2)

      checker.calledTimes = 0

      fastify.inject({
        method: 'post',
        url: '/no'
      }, (err, res) => {
        t.error(err)
        t.equal(checker.calledTimes, 1)
      })
    })
  })
}

function testBeforeHandlerHook (hook) {
  test(`${hook} option should be unique per route`, t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        req.hello = 'earth'
        endRouteHook(doneOrPayload, done)
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
      const payload = JSON.parse(res.payload)
      t.same(payload, { hello: 'earth' })
    })

    fastify.inject({
      method: 'POST',
      url: '/no',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
      t.same(payload, { hello: 'world' })
    })
  })

  test(`${hook} option should handle errors`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        endRouteHook(doneOrPayload, done, new Error('kaboom'))
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
      t.equal(res.statusCode, 500)
      t.same(payload, {
        message: 'kaboom',
        error: 'Internal Server Error',
        statusCode: 500
      })
    })
  })

  test(`${hook} option should handle throwing objects`, t => {
    t.plan(4)
    const fastify = Fastify()

    const myError = { myError: 'kaboom' }

    fastify.setErrorHandler(async (error, request, reply) => {
      t.same(error, myError, 'the error object throws by the user')
      return reply.code(500).send({ this: 'is', my: 'error' })
    })

    fastify.get('/', {
      [hook]: async () => {
        // eslint-disable-next-line no-throw-literal
        throw myError
      }
    }, (req, reply) => {
      t.fail('the handler must not be called')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 500)
      t.same(res.json(), { this: 'is', my: 'error' })
    })
  })

  test(`${hook} option should handle throwing objects by default`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.get('/', {
      [hook]: async () => {
        // eslint-disable-next-line no-throw-literal
        throw { myError: 'kaboom', message: 'i am an error' }
      }
    }, (req, reply) => {
      t.fail('the handler must not be called')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.equal(res.statusCode, 500)
      t.same(res.json(), { myError: 'kaboom', message: 'i am an error' })
    })
  })

  test(`${hook} option should handle errors with custom status code`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.post('/', {
      [hook]: (req, reply, doneOrPayload, done) => {
        reply.code(401)
        endRouteHook(doneOrPayload, done, new Error('go away'))
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
      t.equal(res.statusCode, 401)
      t.same(payload, {
        message: 'go away',
        error: 'Unauthorized',
        statusCode: 401
      })
    })
  })

  test(`${hook} option should keep the context`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.post('/', {
      [hook]: function (req, reply, doneOrPayload, done) {
        t.equal(this.foo, 42)
        this.foo += 1
        endRouteHook(doneOrPayload, done)
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
      const payload = JSON.parse(res.payload)
      t.same(payload, { foo: 43 })
    })
  })

  test(`${hook} option should keep the context (array)`, t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.decorate('foo', 42)

    fastify.post('/', {
      [hook]: [function (req, reply, doneOrPayload, done) {
        t.equal(this.foo, 42)
        this.foo += 1
        endRouteHook(doneOrPayload, done)
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
      const payload = JSON.parse(res.payload)
      t.same(payload, { foo: 43 })
    })
  })
}

testExecutionHook('preHandler')
testExecutionHook('onSend')
testExecutionHook('onRequest')
testExecutionHook('onResponse')
testExecutionHook('preValidation')
testExecutionHook('preParsing')
// hooks that comes before the handler
testBeforeHandlerHook('preHandler')
testBeforeHandlerHook('onRequest')
testBeforeHandlerHook('preValidation')
testBeforeHandlerHook('preParsing')

test('preValidation option should be called before preHandler hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, done) => {
    t.ok(req.called)
    done()
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
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
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
    t.same(JSON.parse(res.payload), { hello: 'another world' })
  })
})

test('preParsing option should be called before preValidation hook', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preValidation', (req, reply, done) => {
    t.ok(req.called)
    done()
  })

  fastify.post('/', {
    preParsing: (req, reply, payload, done) => {
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
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('preParsing option should be able to modify the payload', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/only', {
    preParsing: (req, reply, payload, done) => {
      const stream = new Readable()
      stream.receivedEncodedLength = parseInt(req.headers['content-length'], 10)
      stream.push(JSON.stringify({ hello: 'another world' }))
      stream.push(null)
      done(null, stream)
    }
  }, (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/only',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.same(JSON.parse(res.payload), { hello: 'another world' })
  })
})

test('preParsing option should be able to supply statusCode', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/only', {
    preParsing: async (req, reply, payload) => {
      const stream = new Readable({
        read () {
          const error = new Error('kaboom')
          error.statusCode = 408
          this.destroy(error)
        }
      })
      stream.receivedEncodedLength = 20
      return stream
    },
    onError: async (req, res, err) => {
      t.equal(err.statusCode, 408)
    }
  }, (req, reply) => {
    t.fail('should not be called')
  })

  fastify.inject({
    method: 'POST',
    url: '/only',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 408)
    t.same(JSON.parse(res.payload), {
      statusCode: 408,
      error: 'Request Timeout',
      message: 'kaboom'
    })
  })
})

test('onRequest option should be called before preParsing', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', (req, reply, payload, done) => {
    t.ok(req.called)
    done()
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
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('onTimeout on route', t => {
  t.plan(4)
  const fastify = Fastify({ connectionTimeout: 500 })

  fastify.get('/timeout', {
    handler (request, reply) { },
    onTimeout (request, reply, done) {
      t.pass('onTimeout called')
      done()
    }
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: `${address}/timeout`
    }, (err, response, body) => {
      t.type(err, Error)
      t.equal(err.message, 'socket hang up')
    })
  })
})

test('onError on route', t => {
  t.plan(3)

  const fastify = Fastify()

  const err = new Error('kaboom')

  fastify.get('/',
    {
      onError (request, reply, error, done) {
        t.match(error, err)
        done()
      }
    },
    (req, reply) => {
      reply.send(err)
    })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.same(JSON.parse(res.payload), {
      error: 'Internal Server Error',
      message: 'kaboom',
      statusCode: 500
    })
  })
})
