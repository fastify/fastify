'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')

const payload = { hello: 'world' }

test('hooks', t => {
  t.plan(21)
  const fastify = Fastify()

  try {
    fastify.addHook('preHandler', function (request, reply, next) {
      request.test = 'the request is coming'
      reply.test = 'the reply has come'
      if (request.req.method === 'HEAD') {
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

  fastify.addHook('onSend', function (req, reply, ctx, next) {
    t.ok('onSend called')
    next()
  })

  fastify.get('/', function (req, reply) {
    t.is(req.req.raw, 'the request is coming')
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
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addHook('onRequest', () => {})
    t.is(instance._hooks.onRequest.length, 1)
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onRequest.length, 0)
  })
})

test('onRequest hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onRequest', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onRequest', () => {})
    t.is(instance._hooks.onRequest.length, 2)
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onRequest.length, 1)
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
    t.ok(req.req.first)
    t.notOk(req.req.second)
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
      t.ok(req.req.first)
      t.ok(req.req.second)
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

test('onResponse hook should support encapsulation / 1', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.addHook('onResponse', () => {})
    t.is(instance._hooks.onResponse.length, 1)
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onResponse.length, 0)
  })
})

test('onResponse hook should support encapsulation / 2', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('onResponse', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onResponse', () => {})
    t.is(instance._hooks.onResponse.length, 2)
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onResponse.length, 1)
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

  fastify.addHook('onSend', () => {})

  fastify.register((instance, opts, next) => {
    instance.addHook('onSend', () => {})
    t.is(instance._hooks.onSend.length, 2)
    next()
  })

  fastify.ready(err => {
    t.error(err)
    t.is(fastify._hooks.onSend.length, 1)
  })
})

test('onSend hook should support encapsulation / 2', t => {
  t.plan(16)
  const fastify = Fastify()
  fastify.decorate('hello', 'world')

  fastify.addHook('onSend', function (request, reply, ctx, next) {
    t.ok(this.hello)
    t.ok('onSend called')
    next()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.decorate('hello2', 'world')
    instance.addHook('onSend', function (request, reply, ctx, next) {
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

test('modify payload', t => {
  t.plan(7)
  const fastify = Fastify()
  const payload = { hello: 'world' }
  const modifiedPayload = { winter: 'is coming' }

  fastify.addHook('onSend', function (request, reply, ctx, next) {
    t.ok('onSend called')
    t.deepEqual(ctx.payload, payload)
    // onSend allows only to modify Object keys and not the full object's reference
    ctx.payload = modifiedPayload
    next()
  })

  fastify.addHook('onSend', function (request, reply, ctx, next) {
    t.ok('onSend called')
    t.deepEqual(ctx.payload, modifiedPayload)
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.deepEqual(modifiedPayload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 22)
  })
})

test('onSend hook throws', t => {
  t.plan(7)
  const fastify = Fastify()
  fastify.addHook('onSend', function (request, reply, payload, next) {
    if (request.req.method === 'DELETE') {
      next(new Error('some error'))
      return
    }
    next()
  })

  fastify.get('/', (req, reply) => {
    reply.send({hello: 'world'})
  })

  fastify.delete('/', (req, reply) => {
    reply.send({hello: 'world'})
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

if (Number(process.versions.node[0]) >= 8) {
  require('./hooks-async')(t)
} else {
  t.pass('Skip because Node version < 8')
  t.end()
}
