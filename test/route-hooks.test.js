'use strict'

const { Readable } = require('stream')
const test = require('tap').test
const Fastify = require('../')

process.removeAllListeners('warning')

function endRouteHook (doneOrPayload, done) {
  if (typeof doneOrPayload === 'function') {
    doneOrPayload()
  } else {
    done()
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
      t.deepEqual(payload, { hello: 'world' })
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
      const payload = JSON.parse(res.payload)
      t.deepEqual(payload, { hello: 'earth' })
    })

    fastify.inject({
      method: 'POST',
      url: '/no',
      payload: { hello: 'world' }
    }, (err, res) => {
      t.error(err)
      const payload = JSON.parse(res.payload)
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
      const payload = JSON.parse(res.payload)
      t.equal(res.statusCode, 500)
      t.deepEqual(payload, {
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
      t.deepEqual(error, myError, 'the error object throws by the user')
      reply.send({ this: 'is', my: 'error' })
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
      t.is(res.statusCode, 500)
      t.deepEqual(res.json(), { this: 'is', my: 'error' })
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
      t.is(res.statusCode, 500)
      t.deepEqual(res.json(), { myError: 'kaboom', message: 'i am an error' })
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
      const payload = JSON.parse(res.payload)
      t.equal(res.statusCode, 401)
      t.deepEqual(payload, {
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
      const payload = JSON.parse(res.payload)
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
      const payload = JSON.parse(res.payload)
      t.deepEqual(payload, { foo: 43 })
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
    t.true(req.called)
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

  fastify.addHook('preValidation', (req, reply, done) => {
    t.true(req.called)
    done()
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
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
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
    t.deepEqual(JSON.parse(res.payload), { hello: 'another world' })
  })
})

test('onRequest option should be called before preParsing', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', (req, reply, done) => {
    t.true(req.called)
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
    t.deepEqual(payload, { hello: 'world' })
  })
})
