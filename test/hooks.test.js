'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')
const fastify = require('..')()

test('hooks - add preHandler', t => {
  t.plan(1)
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
})

test('hooks - add onRequest', t => {
  t.plan(1)
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
})

fastify.addHook('onResponse', function (res, next) {
  t.ok('onResponse called')
  next()
})

fastify.get('/', function (req, reply) {
  t.is(req.req.raw, 'the request is coming')
  t.is(reply.res.raw, 'the reply has come')
  t.is(req.test, 'the request is coming')
  t.is(reply.test, 'the reply has come')
  reply.code(200).send({ hello: 'world' })
})

fastify.head('/', function (req, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.delete('/', function (req, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('hooks - success', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('hooks - throw preHandler', t => {
    t.plan(2)
    request({
      method: 'HEAD',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })

  test('hooks - throw onRequest', t => {
    t.plan(2)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port
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
  t.plan(13)
  const fastify = Fastify()

  fastify.addHook('onRequest', (req, res, next) => {
    req.first = true
    next()
  })

  fastify.get('/first', (req, reply) => {
    t.ok(req.req.first)
    t.notOk(req.req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onRequest', (req, res, next) => {
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

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('preHandler hook should support encapsulation / 5', t => {
  t.plan(13)
  const fastify = Fastify()

  fastify.addHook('preHandler', (req, res, next) => {
    req.first = true
    next()
  })

  fastify.get('/first', (req, reply) => {
    t.ok(req.first)
    t.notOk(req.second)
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('preHandler', (req, res, next) => {
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

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/second'
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
  t.plan(12)
  const fastify = Fastify()

  fastify.addHook('onResponse', (res, next) => {
    t.ok('onResponse called')
    next()
  })

  fastify.get('/first', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.register((instance, opts, next) => {
    instance.addHook('onResponse', (res, next) => {
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

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
