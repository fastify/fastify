'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const http = require('http')
const NotFound = require('http-errors').NotFound
const Reply = require('../../lib/reply')
const { Writable } = require('readable-stream')
const {
  kReplyErrorHandlerCalled,
  kReplyHeaders,
  kReplySerializer,
  kReplyIsError
} = require('../../lib/symbols')

test('Once called, Reply should return an object with methods', t => {
  t.plan(13)
  const response = { res: 'res' }
  function context () {}
  function request () {}
  const reply = new Reply(response, context, request)
  t.is(typeof reply, 'object')
  t.is(typeof reply[kReplyIsError], 'boolean')
  t.is(typeof reply[kReplyErrorHandlerCalled], 'boolean')
  t.is(typeof reply.send, 'function')
  t.is(typeof reply.code, 'function')
  t.is(typeof reply.status, 'function')
  t.is(typeof reply.header, 'function')
  t.is(typeof reply.serialize, 'function')
  t.is(typeof reply.getResponseTime, 'function')
  t.is(typeof reply[kReplyHeaders], 'object')
  t.strictEqual(reply.res, response)
  t.strictEqual(reply.context, context)
  t.strictEqual(reply.request, request)
})

test('reply.send throw with circular JSON', t => {
  t.plan(1)
  const response = {
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {},
    end: () => {}
  }
  const reply = new Reply(response, { onSend: [] }, null)
  t.throws(() => {
    var obj = {}
    obj.obj = obj
    reply.send(JSON.stringify(obj))
  }, 'Converting circular structure to JSON')
})

test('reply.send returns itself', t => {
  t.plan(1)
  const response = {
    setHeader: () => {},
    hasHeader: () => false,
    getHeader: () => undefined,
    writeHead: () => {},
    end: () => {}
  }
  const reply = new Reply(response, { onSend: [] }, null)
  t.equal(reply.send('hello'), reply)
})

test('reply.serializer should set a custom serializer', t => {
  t.plan(2)
  const reply = new Reply(null, null, null)
  t.equal(reply[kReplySerializer], null)
  reply.serializer('serializer')
  t.equal(reply[kReplySerializer], 'serializer')
})

test('reply.serialize should serialize payload', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, context, null)
  t.equal(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
})

test('reply.serialize should serialize payload with a custom serializer', t => {
  t.plan(2)
  let customSerializerCalled = false
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, context, null)
  reply.serializer((x) => (customSerializerCalled = true) && JSON.stringify(x))
  t.equal(reply.serialize({ foo: 'bar' }), '{"foo":"bar"}')
  t.equal(customSerializerCalled, true, 'custom serializer not called')
})

test('reply.serialize should serialize payload with Fastify instance', t => {
  t.plan(2)
  const fastify = require('../..')()
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            foo: { type: 'string' }
          }
        }
      }
    },
    handler: (req, reply) => {
      reply.send(
        reply.serialize({ foo: 'bar' })
      )
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"foo":"bar"}')
  })
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

  fastify.get('/redirect-code-before-call', function (req, reply) {
    reply.code(307).redirect('/')
  })

  fastify.get('/redirect-code-before-call-overwrite', function (req, reply) {
    reply.code(307).redirect(302, '/')
  })

  fastify.get('/custom-serializer', function (req, reply) {
    reply.code(200)
    reply.type('text/plain')
    reply.serializer(function (body) {
      return require('querystring').stringify(body)
    })
    reply.send({ hello: 'world!' })
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
        t.strictEqual(response.headers.location, '/')
      })
    })

    test('redirect to `/` - 6', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/redirect-code-before-call'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 7', t => {
      t.plan(4)
      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/redirect-code-before-call-overwrite'
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-type'], 'text/plain')
        t.deepEqual(body.toString(), 'hello world!')
      })
    })

    test('redirect to `/` - 8', t => {
      t.plan(1)

      http.get('http://localhost:' + fastify.server.address().port + '/redirect-code-before-call', function (response) {
        t.strictEqual(response.statusCode, 307)
      })
    })

    test('redirect to `/` - 9', t => {
      t.plan(1)

      http.get('http://localhost:' + fastify.server.address().port + '/redirect-code-before-call-overwrite', function (response) {
        t.strictEqual(response.statusCode, 302)
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

test('stream with content type should not send application/octet-stream', t => {
  t.plan(4)

  const fastify = require('../..')()
  const fs = require('fs')
  const path = require('path')

  var streamPath = path.join(__dirname, '..', '..', 'package.json')
  var stream = fs.createReadStream(streamPath)
  var buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.header('Content-Type', 'text/plain').send(stream)
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
      t.deepEqual(body, buf)
    })
  })
})

test('stream using reply.res.writeHead should return customize headers', t => {
  t.plan(6)

  const fastify = require('../..')()
  const fs = require('fs')
  const path = require('path')

  var streamPath = path.join(__dirname, '..', '..', 'package.json')
  var stream = fs.createReadStream(streamPath)
  var buf = fs.readFileSync(streamPath)

  fastify.get('/', function (req, reply) {
    reply.log.warn = function mockWarn (message) {
      t.equal(message, 'response will send, but you shouldn\'t use res.writeHead in stream mode')
    }
    reply.res.writeHead(200, {
      location: '/'
    })
    reply.send(stream)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.headers.location, '/')
      t.strictEqual(response.headers['Content-Type'], undefined)
      t.deepEqual(body, buf)
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
      t.strictEqual(response.headers['content-type'], 'text/plain; charset=utf-8')
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
      t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
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

test('reply.send(new NotFound()) should not invoke the 404 handler', t => {
  t.plan(9)

  const fastify = require('../..')()

  fastify.setNotFoundHandler((req, reply) => {
    t.fail('Should not be called')
  })

  fastify.get('/not-found', function (req, reply) {
    reply.send(new NotFound())
  })

  fastify.register(function (instance, options, next) {
    instance.get('/not-found', function (req, reply) {
      reply.send(new NotFound())
    })

    next()
  }, { prefix: '/prefixed' })

  fastify.listen(0, err => {
    t.error(err)

    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.deepEqual(JSON.parse(body.toString()), {
        statusCode: 404,
        error: 'Not Found',
        message: 'Not Found'
      })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/prefixed/not-found'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      t.strictEqual(response.headers['content-type'], 'application/json; charset=utf-8')
      t.deepEqual(JSON.parse(body), {
        error: 'Not Found',
        message: 'Not Found',
        statusCode: 404
      })
    })
  })
})

test('reply can set multiple instances of same header', t => {
  t.plan(4)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .send({})
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.ok(response.headers['set-cookie'])
      t.strictDeepEqual(response.headers['set-cookie'], ['one', 'two'])
    })
  })
})

test('reply.hasHeader returns correct values', t => {
  t.plan(3)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.is(reply.hasHeader('x-foo'), true)
    t.is(reply.hasHeader('x-bar'), false)
    reply.send()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, () => {})
  })
})

test('reply.getHeader returns correct values', t => {
  t.plan(4)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.is(reply.getHeader('x-foo'), 'foo')

    reply.header('x-foo', 'bar')
    t.strictDeepEqual(reply.getHeader('x-foo'), 'bar')

    reply.header('set-cookie', 'one')
    reply.header('set-cookie', 'two')
    t.strictDeepEqual(reply.getHeader('set-cookie'), ['one', 'two'])

    reply.send()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, () => {})
  })
})

test('reply.removeHeader can remove the value', t => {
  t.plan(5)

  const fastify = require('../../')()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    t.is(reply.getHeader('x-foo'), 'foo')

    t.is(reply.removeHeader('x-foo'), reply)
    t.strictDeepEqual(reply.getHeader('x-foo'), undefined)

    reply.send()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, () => {
      t.pass()
    })
  })
})

test('reply.header can reset the value', t => {
  t.plan(3)

  const fastify = require('../../')()

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/headers', function (req, reply) {
    reply.header('x-foo', 'foo')
    reply.header('x-foo', undefined)
    t.strictDeepEqual(reply.getHeader('x-foo'), '')

    reply.send()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, () => {
      t.pass()
    })
  })
})

test('Reply should handle JSON content type with a charset', t => {
  t.plan(16)

  const fastify = require('../../')()

  fastify.get('/default', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.get('/utf8', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-8')
      .send({ hello: 'world' })
  })

  fastify.get('/utf16', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-16')
      .send({ hello: 'world' })
  })

  fastify.get('/utf32', function (req, reply) {
    reply
      .header('content-type', 'application/json; charset=utf-32')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf8', function (req, reply) {
    reply
      .type('application/json; charset=utf-8')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf16', function (req, reply) {
    reply
      .type('application/json; charset=utf-16')
      .send({ hello: 'world' })
  })

  fastify.get('/type-utf32', function (req, reply) {
    reply
      .type('application/json; charset=utf-32')
      .send({ hello: 'world' })
  })

  fastify.get('/no-space-type-utf32', function (req, reply) {
    reply
      .type('application/json;charset=utf-32')
      .send({ hello: 'world' })
  })

  fastify.inject('/default', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/utf8', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/utf16', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-16')
  })

  fastify.inject('/utf32', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-32')
  })

  fastify.inject('/type-utf8', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-8')
  })

  fastify.inject('/type-utf16', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-16')
  })

  fastify.inject('/type-utf32', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-32')
  })

  fastify.inject('/no-space-type-utf32', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json;charset=utf-32')
  })
})

test('Content type and charset set previously', t => {
  t.plan(2)

  const fastify = require('../../')()

  fastify.addHook('onRequest', function (req, reply, next) {
    reply.header('content-type', 'application/json; charset=utf-16')
    next()
  })

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.is(res.headers['content-type'], 'application/json; charset=utf-16')
  })
})

test('.status() is an alias for .code()', t => {
  t.plan(2)
  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.status(418).send()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.is(res.statusCode, 418)
  })
})

test('.statusCode is getter and setter', t => {
  t.plan(4)
  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    t.ok(reply.statusCode, 200, 'default status value')
    reply.statusCode = 418
    t.ok(reply.statusCode, 418)
    reply.send()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.is(res.statusCode, 418)
  })
})

test('reply.header setting multiple cookies as multiple Set-Cookie headers', t => {
  t.plan(7)

  const fastify = require('../../')()

  fastify.get('/headers', function (req, reply) {
    reply
      .header('set-cookie', 'one')
      .header('set-cookie', 'two')
      .header('set-cookie', 'three')
      .header('set-cookie', ['four', 'five', 'six'])
      .send({})
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/headers'
    }, (err, response, body) => {
      t.error(err)
      t.ok(response.headers['set-cookie'])
      t.strictDeepEqual(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
    })
  })

  fastify.inject('/headers', (error, response) => {
    t.error(error)
    t.ok(response.headers['set-cookie'])
    t.strictDeepEqual(response.headers['set-cookie'], ['one', 'two', 'three', 'four', 'five', 'six'])
  })
})

test('should throw error when passing falsy value to reply.sent', t => {
  t.plan(3)
  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    try {
      reply.sent = false
    } catch (err) {
      t.strictEqual(err.message, 'FST_ERR_REP_SENT_VALUE: The only possible value for reply.sent is true.')
      reply.send()
    }
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()
  })
})

test('should throw error when attempting to set reply.sent more than once', t => {
  t.plan(3)
  const fastify = require('../..')()

  fastify.get('/', function (req, reply) {
    reply.sent = true
    try {
      reply.sent = true
    } catch (err) {
      t.strictEqual(err.message, 'FST_ERR_REP_ALREADY_SENT: Reply was already sent.')
    }
    reply.res.end()
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.pass()
  })
})

test('reply.getResponseTime() should return 0 before the timer is initialised on the reply by setting up response listeners', t => {
  t.plan(1)
  const response = { statusCode: 200 }
  const context = {}
  const reply = new Reply(response, context, null)
  t.equal(reply.getResponseTime(), 0)
})

test('reply.getResponseTime() should return a number greater than 0 after the timer is initialised on the reply by setting up response listeners', t => {
  t.plan(1)
  const fastify = require('../..')()
  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send('hello world')
    }
  })

  fastify.addHook('onResponse', (req, reply) => {
    t.true(reply.getResponseTime() > 0)
    t.end()
  })

  fastify.inject({ method: 'GET', url: '/' })
})

test('reply should use the custom serializer', t => {
  t.plan(4)
  const fastify = require('../..')()
  fastify.setReplySerializer((payload, statusCode) => {
    t.deepEqual(payload, { foo: 'bar' })
    t.equal(statusCode, 200)
    payload.foo = 'bar bar'
    return JSON.stringify(payload)
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"foo":"bar bar"}')
  })
})

test('reply should use the right serializer in encapsulated context', t => {
  t.plan(9)

  const fastify = require('../..')()
  fastify.setReplySerializer((payload) => {
    t.deepEqual(payload, { foo: 'bar' })
    payload.foo = 'bar bar'
    return JSON.stringify(payload)
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => { reply.send({ foo: 'bar' }) }
  })

  fastify.register(function (instance, opts, next) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ john: 'doo' }) }
    })
    instance.setReplySerializer((payload) => {
      t.deepEqual(payload, { john: 'doo' })
      payload.john = 'too too'
      return JSON.stringify(payload)
    })
    next()
  })

  fastify.register(function (instance, opts, next) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ sweet: 'potato' }) }
    })
    instance.setReplySerializer((payload) => {
      t.deepEqual(payload, { sweet: 'potato' })
      payload.sweet = 'potato potato'
      return JSON.stringify(payload)
    })
    next()
  }, { prefix: 'sub' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"foo":"bar bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"john":"too too"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub/sub'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"sweet":"potato potato"}')
  })
})

test('reply should use the right serializer in deep encapsulated context', t => {
  t.plan(8)

  const fastify = require('../..')()

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => { reply.send({ foo: 'bar' }) }
  })

  fastify.register(function (instance, opts, next) {
    instance.route({
      method: 'GET',
      url: '/sub',
      handler: (req, reply) => { reply.send({ john: 'doo' }) }
    })
    instance.setReplySerializer((payload) => {
      t.deepEqual(payload, { john: 'doo' })
      payload.john = 'too too'
      return JSON.stringify(payload)
    })

    instance.register(function (subInstance, opts, next) {
      subInstance.route({
        method: 'GET',
        url: '/deep',
        handler: (req, reply) => { reply.send({ john: 'deep' }) }
      })
      subInstance.setReplySerializer((payload) => {
        t.deepEqual(payload, { john: 'deep' })
        payload.john = 'deep deep'
        return JSON.stringify(payload)
      })
      next()
    })
    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"foo":"bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/sub'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"john":"too too"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/deep'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"john":"deep deep"}')
  })
})

test('reply should use the route serializer', t => {
  t.plan(3)

  const fastify = require('../..')()
  fastify.setReplySerializer(() => {
    t.fail('this serializer should not be executed')
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply
        .serializer((payload) => {
          t.deepEqual(payload, { john: 'doo' })
          payload.john = 'too too'
          return JSON.stringify(payload)
        })
        .send({ john: 'doo' })
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, '{"john":"too too"}')
  })
})

test('cannot set the replySerializer when the server is running', t => {
  t.plan(2)

  const fastify = require('../..')()
  t.teardown(fastify.close.bind(fastify))

  fastify.listen(err => {
    t.error(err)
    try {
      fastify.setReplySerializer(() => {})
      t.fail('this serializer should not be setup')
    } catch (e) {
      t.is(e.message, 'Cannot call "setReplySerializer" when fastify instance is already started!')
    }
  })
})

test('reply should not call the custom serializer for errors and not found', t => {
  t.plan(9)

  const fastify = require('../..')()
  fastify.setReplySerializer((payload, statusCode) => {
    t.deepEqual(payload, { foo: 'bar' })
    t.equal(statusCode, 200)
    return JSON.stringify(payload)
  })

  fastify.get('/', (req, reply) => { reply.send({ foo: 'bar' }) })
  fastify.get('/err', (req, reply) => { reply.send(new Error('an error')) })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, '{"foo":"bar"}')
  })

  fastify.inject({
    method: 'GET',
    url: '/err'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
  })

  fastify.inject({
    method: 'GET',
    url: '/not-existing'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 404)
  })
})

test('reply.then', t => {
  t.plan(2)

  function context () {}
  function request () {}

  t.test('without an error', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, context, request)

    reply.then(function () {
      t.pass('fullfilled called')
    })

    response.destroy()
  })

  t.test('with an error', t => {
    t.plan(1)

    const response = new Writable()
    const reply = new Reply(response, context, request)
    const _err = new Error('kaboom')

    reply.then(function () {
      t.fail('fullfilled called')
    }, function (err) {
      t.equal(err, _err)
    })

    response.destroy(_err)
  })
})
