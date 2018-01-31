'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const http = require('http')
const NotFound = require('http-errors').NotFound
const Reply = require('../../lib/reply')

test('Once called, Reply should return an object with methods', t => {
  t.plan(10)
  const response = { res: 'res' }
  function context () {}
  function request () {}
  const reply = new Reply(response, context, request)
  t.is(typeof reply, 'object')
  t.is(typeof reply._isError, 'boolean')
  t.is(typeof reply._customError, 'boolean')
  t.is(typeof reply.send, 'function')
  t.is(typeof reply.code, 'function')
  t.is(typeof reply.header, 'function')
  t.is(typeof reply.serialize, 'function')
  t.strictEqual(reply.res, response)
  t.strictEqual(reply.context, context)
  t.strictEqual(reply.request, request)
})

test('reply.send throw with circular JSON', t => {
  t.plan(1)
  const request = {}
  const response = { setHeader: () => {} }
  const reply = new Reply(request, response, null)
  t.throws(() => {
    var obj = {}
    obj.obj = obj
    reply.send(JSON.stringify(obj))
  })
})

test('reply.serializer should set a custom serializer', t => {
  t.plan(2)
  const reply = new Reply(null, null, null)
  t.equal(reply._serializer, null)
  reply.serializer('serializer')
  t.equal(reply._serializer, 'serializer')
})

test('within an instance', t => {
  const fastify = require('../..')()
  const test = t.test

  fastify.get('/', function (req, reply) {
    reply.code(200)
    reply.header('Content-Type', 'text/plain')
    reply.send('hello world!')
  })

  fastify.get('/auto-type', function (req, reply) {
    reply.code(200)
    reply.type('text/plain')
    reply.send('hello world!')
  })

  fastify.get('/auto-status-code', function (req, reply) {
    reply.send('hello world!')
  })

  fastify.get('/redirect', function (req, reply) {
    reply.redirect('/')
  })

  fastify.get('/redirect-code', function (req, reply) {
    reply.redirect(301, '/')
  })

  fastify.get('/custom-serializer', function (req, reply) {
    reply.code(200)
    reply.type('text/plain')
    reply.serializer(function (body) {
      return require('querystring').stringify(body)
    })
    reply.send({hello: 'world!'})
  })

  fastify.register(function (instance, options, next) {
    fastify.addHook('onSend', function (req, reply, payload, next) {
      reply.header('x-onsend', 'yes')
      next()
    })
    fastify.get('/redirect-onsend', function (req, reply) {
      reply.redirect('/')
    })
    next()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    test('custom serializer should be used', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/custom-serializer'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello=world!')
      })
    })

    test('status code and content-type should be correct', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('auto status code shoud be 200', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/auto-status-code'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('auto type shoud be text/plain', t => {
      t.plan(3)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/auto-type'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 1', t => {
      t.plan(1)

      http.get('http://localhost:' + fastify.server.address().port + '/redirect', function (response) {
        t.strictEqual(response.statusCode, 302)
      })
    })

    test('redirect to `/` - 2', t => {
      t.plan(1)

      http.get('http://localhost:' + fastify.server.address().port + '/redirect-code', function (response) {
        t.strictEqual(response.statusCode, 301)
      })
    })

    test('redirect to `/` - 3', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/redirect'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 4', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/redirect-code'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 5', t => {
      t.plan(3)
      const url = 'http://localhost:' + fastify.server.address().port + '/redirect-onsend'
      http.get(url, (response) => {
        t.strictEqual(response.headers['x-onsend'], 'yes')
        t.strictEqual(response.headers['content-length'], '0')
        t.strictEqual(response.headers['location'], '/')
      })
    })

    t.end()
  })
})

test('buffer without content type should send a application/octet-stream and raw buffer', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'application/octet-stream')
      t.deepEqual(body, Buffer.alloc(1024))
    })
  })
})

test('buffer with content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain')
    reply.send(Buffer.alloc(1024))
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'text/plain')
      t.deepEqual(body, Buffer.alloc(1024))
    })
  })
})

test('plain string without content type should send a text/plain', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.send('hello world!')
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'text/plain')
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('plain string with content type should be sent unmodified', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.type('text/css').send('hello world!')
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'text/css')
      t.deepEqual(body.toString(), 'hello world!')
    })
  })
})

test('plain string with content type and custom serializer should be serialized', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply
      .serializer(() => 'serialized')
      .type('text/css')
      .send('hello world!')
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'text/css')
      t.deepEqual(body.toString(), 'serialized')
    })
  })
})

test('plain string with content type application/json should be serialized as json', t => {
  t.plan(4)

  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.type('application/json').send('hello world!')
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], 'application/json')
      t.deepEqual(body.toString(), '"hello world!"')
    })
  })
})

test('error object with a content type that is not application/json should work', t => {
  t.plan(6)

  const fastify = require('../..')()

  fastify.get('/text', function (req, reply) {
    reply.type('text/plain')
    reply.send(new Error('some application error'))
  })

  fastify.get('/html', function (req, reply) {
    reply.type('text/html')
    reply.send(new Error('some application error'))
  })

  fastify.inject({
    method: 'GET',
    url: '/text'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(JSON.parse(res.payload).message, 'some application error')
  })

  fastify.inject({
    method: 'GET',
    url: '/html'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
    t.strictEqual(JSON.parse(res.payload).message, 'some application error')
  })
})

test('undefined payload should be sent as-is', t => {
  t.plan(6)

  const fastify = require('../..')()

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.strictEqual(payload, undefined)
    next()
  })

  fastify.get('/', function (req, reply) {
    reply.code(204).send()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: `http://localhost:${fastify.server.address().port}`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers['content-type'], undefined)
      t.strictEqual(response.headers['content-length'], undefined)
      t.strictEqual(body.length, 0)
    })
  })
})

test('reply.send(new NotFound()) should invoke the 404 handler', t => {
  t.plan(9)

  const fastify = require('../..')()

  fastify.get('/not-found', function (req, reply) {
    reply.send(new NotFound())
  })

  fastify.register(function (instance, options, next) {
    instance.get('/not-found', function (req, reply) {
      reply.send(new NotFound())
    })

    instance.setNotFoundHandler(function (req, reply) {
      reply.code(404).send('Custom not found response')
    })

    next()
  }, {prefix: '/prefixed'})

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      t.strictEqual(response.headers['content-type'], 'application/json')
      t.deepEqual(JSON.parse(body.toString()), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not found'
      })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/prefixed/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      t.strictEqual(response.headers['content-type'], 'text/plain')
      t.deepEqual(body.toString(), 'Custom not found response')
    })
  })
})

test('reply.send(new NotFound()) should log a warning and send a basic response if called inside a 404 handler', t => {
  t.plan(6)

  const fastify = require('../..')()

  fastify.get('/not-found', function (req, reply) {
    reply.send(new NotFound())
  })

  fastify.setNotFoundHandler(function (req, reply) {
    reply.res.log.warn = function mockWarn (message) {
      t.equal(message, 'Trying to send a NotFound error inside a 404 handler. Sending basic 404 response.')
    }

    reply.send(new NotFound())
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      t.strictEqual(response.headers['content-type'], 'text/plain')
      t.deepEqual(body.toString(), '404 Not Found')
    })
  })
})
