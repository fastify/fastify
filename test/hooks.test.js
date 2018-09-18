'use strict'

const t = require('tap')
const test = t.test
const semver = require('semver')
const sget = require('simple-get').concat
const stream = require('stream')
const Fastify = require('..')
const fp = require('fastify-plugin')
const fs = require('fs')

const payload = { hello: 'world' }

test('hooks', t => {
  t.plan(21)
  const fastify = Fastify()

  try {
    fastify.addHook('preHandler', function (request, reply, next) {
      request.test = 'the request is coming'
      reply.test = 'the reply has come'
      if (request.raw.method === 'HEAD') {
        next(new Error('some error'))
      } else {
        next()
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.addHook('onRequest', function (req, res, next) {
      req.raw = 'the request is coming'
      res.raw = 'the reply has come'
      if (req.method === 'DELETE') {
        next(new Error('some error'))
      } else {
        next()
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  fastify.addHook('onResponse', function (res, next) {
    t.ok('onResponse called')
    next()
  })

  fastify.addHook('onSend', function (req, reply, thePayload, next) {
    t.ok('onSend called')
    next()
  })

  fastify.get('/', function (req, reply) {
    t.is(req.raw.raw, 'the request is coming')
    t.is(reply.res.raw, 'the reply has come')
    t.is(req.test, 'the request is coming')
    t.is(reply.test, 'the reply has come')
    reply.code(200).send(payload)
  })

  fastify.head('/', function (req, reply) {
    reply.code(200).send(payload)
  })

  fastify.delete('/', function (req, reply) {
    reply.code(200).send(payload)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'HEAD',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })

    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})

test('onRequest hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addHook('onRequest', (req, res, next) => {
      t.strictEqual(req.url, '/plugin')
      next()
    })

    instance.get('/plugin', (request, reply) => {
      reply.send()
    })

    next()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })
})

test('onRequest hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  var pluginInstance

  fastify.addHook('onRequest', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onRequest', () => {})
    pluginInstance = instance
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onRequest.length, 1)
    t.is(pluginInstance._hooks.onRequest.length, 2)
  })
})

test('onRequest hook should support encapsulation / 3', t => {
  t.plan(20)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onRequest', function (req, res, next) {
    t.ok(this.hello)
    t.ok(this.hello2)
    req.first = true
    next()
  })

  fastify.decorate('hello2', 'world')

  fastify.get('/first', (req, reply) => {
    t.ok(req.raw.first)
    t.notOk(req.raw.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.decorate('hello3', 'world')
    instance.addHook('onRequest', function (req, res, next) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok(this.hello3)
      req.second = true
      next()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.raw.first)
      t.ok(req.raw.second)
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('preHandler hook should support encapsulation / 5', t => {
  t.plan(17)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('preHandler', function (req, res, next) {
    t.ok(this.hello)
    req.first = true
    next()
  })

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.decorate('hello2', 'world')
    instance.addHook('preHandler', function (req, res, next) {
      t.ok(this.hello)
      t.ok(this.hello2)
      req.second = true
      next()
    })

    instance.get('/second', (req, reply) => {
      t.ok(req.first)
      t.ok(req.second)
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onRoute hook should be called / 1', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', () => {
      t.pass()
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called / 2', t => {
  t.plan(5)
  let firstHandler = 0
  let secondHandler = 0
  const fastify = Fastify()
  fastify.addHook('onRoute', (route) => {
    t.pass()
    firstHandler++
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', (route) => {
      t.pass()
      secondHandler++
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    next()
  })
    .after(() => {
      t.strictEqual(firstHandler, 1)
      t.strictEqual(secondHandler, 1)
    })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should be called / 3', t => {
  t.plan(6)
  const fastify = Fastify()

  function handler (req, reply) {
    reply.send()
  }

  fastify.addHook('onRoute', (route) => {
    t.pass()
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', (route) => {
      t.pass()
    })
    instance.get('/a', handler)
    next()
  })
    .after((err, done) => {
      t.error(err)
      setTimeout(() => {
        fastify.get('/b', handler)
        done()
      }, 10)
    })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute should keep the context', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register((instance, opts, next) => {
    instance.decorate('test', true)
    instance.addHook('onRoute', onRoute)
    t.ok(instance.prototype === fastify.prototype)

    function onRoute (route) {
      t.ok(this.test)
      t.strictEqual(this, instance)
    }

    instance.get('/', opts, function (req, reply) {
      reply.send()
    })

    next()
  })

  fastify.close((err) => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route', t => {
  t.plan(7)
  const fastify = Fastify()
  fastify.addHook('onRoute', (route) => {
    t.strictEqual(route.method, 'GET')
    t.strictEqual(route.url, '/')
    t.strictEqual(route.path, '/')
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', (route) => {
      t.strictEqual(route.method, 'GET')
      t.strictEqual(route.url, '/')
      t.strictEqual(route.path, '/')
    })
    instance.get('/', opts, function (req, reply) {
      reply.send()
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route with custom prefix', t => {
  t.plan(9)
  const fastify = Fastify()
  fastify.addHook('onRoute', function (route) {
    t.strictEqual(route.method, 'GET')
    t.strictEqual(route.url, '/v1/foo')
    t.strictEqual(route.path, '/v1/foo')
    t.strictEqual(route.prefix, '/v1')
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', function (route) {
      t.strictEqual(route.method, 'GET')
      t.strictEqual(route.url, '/v1/foo')
      t.strictEqual(route.path, '/v1/foo')
      t.strictEqual(route.prefix, '/v1')
    })
    instance.get('/foo', opts, function (req, reply) {
      reply.send()
    })
    next()
  }, { prefix: '/v1' })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should pass correct route with custom options', t => {
  t.plan(5)
  const fastify = Fastify()
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', function (route) {
      t.strictEqual(route.method, 'GET')
      t.strictEqual(route.url, '/foo')
      t.strictEqual(route.logLevel, 'info')
      t.strictEqual(route.bodyLimit, 100)
    })
    instance.get('/foo', { logLevel: 'info', bodyLimit: 100 }, function (req, reply) {
      reply.send()
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should receive any route option', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', function (route) {
      t.strictEqual(route.method, 'GET')
      t.strictEqual(route.url, '/foo')
      t.strictEqual(route.auth, 'basic')
    })
    instance.get('/foo', { auth: 'basic' }, function (req, reply) {
      reply.send()
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should preserve system route configuration', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', function (route) {
      t.strictEqual(route.method, 'GET')
      t.strictEqual(route.url, '/foo')
      t.strictEqual(route.handler.length, 2)
    })
    instance.get('/foo', { url: '/bar', method: 'POST' }, function (req, reply) {
      reply.send()
    })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onRoute hook should preserve handler function in options of shorthand route system configuration', t => {
  t.plan(2)

  const handler = (req, reply) => {}

  const fastify = Fastify()
  fastify.register((instance, opts, next) => {
    instance.addHook('onRoute', function (route) {
      t.strictEqual(route.handler, handler)
    })
    instance.get('/foo', { handler })
    next()
  })

  fastify.ready(err => {
    t.error(err)
  })
})

test('onResponse hook should support encapsulation / 1', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addHook('onResponse', (res, next) => {
      t.strictEqual(res.plugin, true)
      next()
    })

    instance.get('/plugin', (request, reply) => {
      reply.res.plugin = true
      reply.send()
    })

    next()
  })

  fastify.get('/root', (request, reply) => {
    reply.send()
  })

  fastify.inject('/root', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })

  fastify.inject('/plugin', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
  })
})

test('onResponse hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()
  var pluginInstance

  fastify.addHook('onResponse', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onResponse', () => {})
    pluginInstance = instance
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onResponse.length, 1)
    t.is(pluginInstance._hooks.onResponse.length, 2)
  })
})

test('onResponse hook should support encapsulation / 3', t => {
  t.plan(16)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onResponse', function (res, next) {
    t.ok(this.hello)
    t.ok('onResponse called')
    next()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.decorate('hello2', 'world')
    instance.addHook('onResponse', function (res, next) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok('onResponse called')
      next()
    })

    instance.get('/second', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onSend hook should support encapsulation / 1', t => {
  t.plan(3)
  const fastify = Fastify()
  var pluginInstance

  fastify.addHook('onSend', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onSend', () => {})
    pluginInstance = instance
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onSend.length, 1)
    t.is(pluginInstance._hooks.onSend.length, 2)
  })
})

test('onSend hook should support encapsulation / 2', t => {
  t.plan(16)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onSend', function (request, reply, thePayload, next) {
    t.ok(this.hello)
    t.ok('onSend called')
    next()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.decorate('hello2', 'world')
    instance.addHook('onSend', function (request, reply, thePayload, next) {
      t.ok(this.hello)
      t.ok(this.hello2)
      t.ok('onSend called')
      next()
    })

    instance.get('/second', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('onSend hook is called after payload is serialized and headers are set', t => {
  t.plan(30)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    const thePayload = { hello: 'world' }

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.deepEqual(JSON.parse(payload), thePayload)
      t.strictEqual(reply._headers['content-type'], 'application/json; charset=utf-8')
      next()
    })

    instance.get('/json', (request, reply) => {
      reply.send(thePayload)
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(payload, 'some text')
      t.strictEqual(reply._headers['content-type'], 'text/plain; charset=utf-8')
      next()
    })

    instance.get('/text', (request, reply) => {
      reply.send('some text')
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    const thePayload = Buffer.from('buffer payload')

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(payload, thePayload)
      t.strictEqual(reply._headers['content-type'], 'application/octet-stream')
      next()
    })

    instance.get('/buffer', (request, reply) => {
      reply.send(thePayload)
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    var chunk = 'stream payload'
    const thePayload = new stream.Readable({
      read () {
        this.push(chunk)
        chunk = null
      }
    })

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(payload, thePayload)
      t.strictEqual(reply._headers['content-type'], 'application/octet-stream')
      next()
    })

    instance.get('/stream', (request, reply) => {
      reply.send(thePayload)
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    const serializedPayload = 'serialized'

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(payload, serializedPayload)
      t.strictEqual(reply._headers['content-type'], 'text/custom')
      next()
    })

    instance.get('/custom-serializer', (request, reply) => {
      reply
        .serializer(() => serializedPayload)
        .type('text/custom')
        .send('needs to be serialized')
    })

    next()
  })

  fastify.inject({
    method: 'GET',
    url: '/json'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
    t.strictEqual(res.headers['content-length'], '17')
  })

  fastify.inject({
    method: 'GET',
    url: '/text'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(res.payload, 'some text')
    t.strictEqual(res.headers['content-length'], '9')
  })

  fastify.inject({
    method: 'GET',
    url: '/buffer'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(res.payload, 'buffer payload')
    t.strictEqual(res.headers['content-length'], '14')
  })

  fastify.inject({
    method: 'GET',
    url: '/stream'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(res.payload, 'stream payload')
    t.strictEqual(res.headers['transfer-encoding'], 'chunked')
  })

  fastify.inject({
    method: 'GET',
    url: '/custom-serializer'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(res.payload, 'serialized')
    t.strictEqual(res.headers['content-type'], 'text/custom')
  })
})

test('modify payload', t => {
  t.plan(10)
  const fastify = Fastify()
  const payload = { hello: 'world' }
  const modifiedPayload = { hello: 'modified' }
  const anotherPayload = '"winter is coming"'

  fastify.addHook('onSend', function (request, reply, thePayload, next) {
    t.ok('onSend called')
    t.deepEqual(JSON.parse(thePayload), payload)
    thePayload = thePayload.replace('world', 'modified')
    next(null, thePayload)
  })

  fastify.addHook('onSend', function (request, reply, thePayload, next) {
    t.ok('onSend called')
    t.deepEqual(JSON.parse(thePayload), modifiedPayload)
    next(null, anotherPayload)
  })

  fastify.addHook('onSend', function (request, reply, thePayload, next) {
    t.ok('onSend called')
    t.strictEqual(thePayload, anotherPayload)
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.payload, anotherPayload)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], '18')
  })
})

test('clear payload', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.ok('onSend called')
    reply.code(304)
    next(null, null)
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 304)
    t.strictEqual(res.payload, '')
    t.strictEqual(res.headers['content-length'], undefined)
    t.strictEqual(res.headers['content-type'], 'application/json; charset=utf-8')
  })
})

test('onSend hook throws', t => {
  t.plan(7)
  const fastify = Fastify()
  fastify.addHook('onSend', function (request, reply, payload, next) {
    if (request.raw.method === 'DELETE') {
      next(new Error('some error'))
      return
    }
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.delete('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
    sget({
      method: 'DELETE',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})

test('onSend hook should receive valid request and reply objects if onRequest hook fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorateRequest('testDecorator', 'testDecoratorVal')
  fastify.decorateReply('testDecorator', 'testDecoratorVal')

  fastify.addHook('onRequest', function (req, res, next) {
    next(new Error('onRequest hook failed'))
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.strictEqual(request.testDecorator, 'testDecoratorVal')
    t.strictEqual(reply.testDecorator, 'testDecoratorVal')
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
  })
})

test('onSend hook should receive valid request and reply objects if middleware fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorateRequest('testDecorator', 'testDecoratorVal')
  fastify.decorateReply('testDecorator', 'testDecoratorVal')

  fastify.use(function (req, res, next) {
    next(new Error('middlware failed'))
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.strictEqual(request.testDecorator, 'testDecoratorVal')
    t.strictEqual(reply.testDecorator, 'testDecoratorVal')
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
  })
})

test('onSend hook should receive valid request and reply objects if a custom content type parser fails', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.decorateRequest('testDecorator', 'testDecoratorVal')
  fastify.decorateReply('testDecorator', 'testDecoratorVal')

  fastify.addContentTypeParser('*', function (req, done) {
    done(new Error('content type parser failed'))
  })

  fastify.addHook('onSend', function (request, reply, payload, next) {
    t.strictEqual(request.testDecorator, 'testDecoratorVal')
    t.strictEqual(reply.testDecorator, 'testDecoratorVal')
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send('hello')
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: 'body'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 500)
  })
})

test('cannot add hook after binding', t => {
  t.plan(2)
  const instance = Fastify()

  instance.get('/', function (request, reply) {
    reply.send({ hello: 'world' })
  })

  instance.listen(0, err => {
    t.error(err)
    t.tearDown(instance.server.close.bind(instance.server))

    try {
      instance.addHook('onRequest', () => {})
      t.fail()
    } catch (e) {
      t.pass()
    }
  })
})

test('onRequest hooks should be able to block a request', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    res.end('hello')
    next()
  })

  fastify.addHook('onRequest', (req, res, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.is(res.payload, 'hello')
  })
})

test('preHandler hooks should be able to block a request', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    reply.send('hello')
    next()
  })

  fastify.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.equal(payload, 'hello')
    next()
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.is(res.payload, 'hello')
  })
})

test('onRequest hooks should be able to block a request (last hook)', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    res.end('hello')
    next()
  })

  fastify.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.is(res.payload, 'hello')
  })
})

test('preHandler hooks should be able to block a request (last hook)', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, reply, next) => {
    reply.send('hello')
    next()
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.equal(payload, 'hello')
    next()
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.is(res.payload, 'hello')
  })
})

test('onRequest respond with a stream', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
    stream.pipe(res)
    res.once('finish', next)
  })

  fastify.addHook('onRequest', (req, res, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
  })
})

test('preHandler respond with a stream', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    t.ok('called')
    next()
  })

  // we are calling `reply.send` inside the `preHandler` hook with a stream,
  // this triggers the `onSend` hook event if `preHanlder` has not yet finished
  const order = [1, 2]

  fastify.addHook('preHandler', (req, reply, next) => {
    const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
    reply.send(stream)
    reply.res.once('finish', () => {
      t.is(order.shift(), 2)
      next()
    })
  })

  fastify.addHook('preHandler', (req, reply, next) => {
    t.fail('this should not be called')
  })

  fastify.addHook('onSend', (req, reply, payload, next) => {
    t.is(order.shift(), 1)
    t.is(typeof payload.pipe, 'function')
    next()
  })

  fastify.addHook('onResponse', (res, next) => {
    t.ok('called')
    next()
  })

  fastify.get('/', function (request, reply) {
    t.fail('we should not be here')
  })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
  })
})

test('Register an hook after a plugin inside a plugin', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    next()
  }))

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    next()
  }))

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Register an hook after a plugin inside a plugin (with beforeHandler)', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    instance.get('/', {
      beforeHandler: (req, reply, next) => {
        t.ok('called')
        next()
      }
    }, function (request, reply) {
      reply.send({ hello: 'world' })
    })

    next()
  }))

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    instance.addHook('preHandler', function (req, reply, next) {
      t.ok('called')
      next()
    })

    next()
  }))

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('Register hooks inside a plugin after an encapsulated plugin', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register(function (instance, opts, next) {
    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('onRequest', function (req, res, next) {
      t.ok('called')
      next()
    })

    instance.addHook('preHandler', function (request, reply, next) {
      t.ok('called')
      next()
    })

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.ok('called')
      next()
    })

    instance.addHook('onResponse', function (res, next) {
      t.ok('called')
      next()
    })

    next()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.is(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onRequest hooks should run in the order in which they are defined', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register(function (instance, opts, next) {
    instance.addHook('onRequest', function (req, res, next) {
      t.strictEqual(req.previous, undefined)
      req.previous = 1
      next()
    })

    instance.get('/', function (request, reply) {
      t.strictEqual(request.req.previous, 5)
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onRequest', function (req, res, next) {
        t.strictEqual(req.previous, 1)
        req.previous = 2
        next()
      })
      next()
    }))

    next()
  })

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('onRequest', function (req, res, next) {
      t.strictEqual(req.previous, 2)
      req.previous = 3
      next()
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onRequest', function (req, res, next) {
        t.strictEqual(req.previous, 3)
        req.previous = 4
        next()
      })
      next()
    }))

    instance.addHook('onRequest', function (req, res, next) {
      t.strictEqual(req.previous, 4)
      req.previous = 5
      next()
    })

    next()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('preHandler hooks should run in the order in which they are defined', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register(function (instance, opts, next) {
    instance.addHook('preHandler', function (request, reply, next) {
      t.strictEqual(request.previous, undefined)
      request.previous = 1
      next()
    })

    instance.get('/', function (request, reply) {
      t.strictEqual(request.previous, 5)
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('preHandler', function (request, reply, next) {
        t.strictEqual(request.previous, 1)
        request.previous = 2
        next()
      })
      next()
    }))

    next()
  })

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('preHandler', function (request, reply, next) {
      t.strictEqual(request.previous, 2)
      request.previous = 3
      next()
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('preHandler', function (request, reply, next) {
        t.strictEqual(request.previous, 3)
        request.previous = 4
        next()
      })
      next()
    }))

    instance.addHook('preHandler', function (request, reply, next) {
      t.strictEqual(request.previous, 4)
      request.previous = 5
      next()
    })

    next()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onSend hooks should run in the order in which they are defined', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(function (instance, opts, next) {
    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(request.previous, undefined)
      request.previous = 1
      next()
    })

    instance.get('/', function (request, reply) {
      reply.send({})
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onSend', function (request, reply, payload, next) {
        t.strictEqual(request.previous, 1)
        request.previous = 2
        next()
      })
      next()
    }))

    next()
  })

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(request.previous, 2)
      request.previous = 3
      next()
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onSend', function (request, reply, payload, next) {
        t.strictEqual(request.previous, 3)
        request.previous = 4
        next()
      })
      next()
    }))

    instance.addHook('onSend', function (request, reply, payload, next) {
      t.strictEqual(request.previous, 4)
      next(null, '5')
    })

    next()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), 5)
  })
})

test('onResponse hooks should run in the order in which they are defined', t => {
  t.plan(8)
  const fastify = Fastify()

  fastify.register(function (instance, opts, next) {
    instance.addHook('onResponse', function (res, next) {
      t.strictEqual(res.previous, undefined)
      res.previous = 1
      next()
    })

    instance.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onResponse', function (res, next) {
        t.strictEqual(res.previous, 1)
        res.previous = 2
        next()
      })
      next()
    }))

    next()
  })

  fastify.register(fp(function (instance, opts, next) {
    instance.addHook('onResponse', function (res, next) {
      t.strictEqual(res.previous, 2)
      res.previous = 3
      next()
    })

    instance.register(fp(function (i, opts, next) {
      i.addHook('onResponse', function (res, next) {
        t.strictEqual(res.previous, 3)
        res.previous = 4
        next()
      })
      next()
    }))

    instance.addHook('onResponse', function (res, next) {
      t.strictEqual(res.previous, 4)
      next()
    })

    next()
  }))

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })
  })
})

test('onRequest, preHandler, and onResponse hooks that resolve to a value do not cause an error', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify
    .addHook('onRequest', () => Promise.resolve(1))
    .addHook('onRequest', () => Promise.resolve(true))
    .addHook('preHandler', () => Promise.resolve(null))
    .addHook('preHandler', () => Promise.resolve('a'))
    .addHook('onResponse', () => Promise.resolve({}))
    .addHook('onResponse', () => Promise.resolve([]))

  fastify.get('/', (request, reply) => {
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, 'hello')
  })
})

test('If a response header has been set inside an hook it shoulod not be overwritten by the final response handler', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    res.setHeader('X-Custom-Header', 'hello')
    next()
  })

  fastify.get('/', (request, reply) => {
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.headers['x-custom-header'], 'hello')
    t.strictEqual(res.headers['content-type'], 'text/plain; charset=utf-8')
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, 'hello')
  })
})

test('If the content type has been set inside an hook it should not be changed', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    res.setHeader('content-type', 'text/html')
    next()
  })

  fastify.get('/', (request, reply) => {
    t.notOk(reply._headers['content-type'])
    reply.send('hello')
  })

  fastify.inject('/', (err, res) => {
    t.error(err)
    t.strictEqual(res.headers['content-type'], 'text/html')
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.payload, 'hello')
  })
})

if (semver.gt(process.versions.node, '8.0.0')) {
  require('./hooks-async')(t)
} else {
  t.pass('Skip because Node version < 8')
  t.end()
}
