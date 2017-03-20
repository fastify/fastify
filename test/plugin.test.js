'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const request = require('request')

test('fastify.plugin should exist', t => {
  t.plan(1)
  const fastify = Fastify()
  t.ok(fastify.plugin)
})

test('fastify.plugin should not incapsulate his code', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.plugin((i, o, n) => {
      i.addServerMethod('test', () => {})
      t.ok(i.test)
      n()
    })

    t.notOk(instance.test)

    instance.get('/', (req, reply) => {
      t.ok(instance.test)
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

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
})

test('fastify.plugin registers root level plugins', t => {
  t.plan(15)
  const fastify = Fastify()

  fastify.plugin((instance, opts, next) => {
    instance.addServerMethod('test', 'first')
    t.ok(instance.test)
    next()
  })

  fastify.register((instance, opts, next) => {
    t.ok(instance.test)
    instance.plugin((i, o, n) => {
      i.addServerMethod('test2', 'second')
      n()
    })

    instance.get('/test2', (req, reply) => {
      t.ok(instance.test2)
      reply.send({ test2: instance.test2 })
    })

    next()
  })

  fastify.ready(() => {
    t.ok(fastify.test)
    t.notOk(fastify.test2)
  })

  fastify.get('/', (req, reply) => {
    t.ok(fastify.test)
    reply.send({ test: fastify.test })
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { test: 'first' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/test2'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { test2: 'second' })
    })
  })
})

test('check dependencies - should not throw', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.plugin((i, o, n) => {
      i.addServerMethod('test', () => {})
      t.ok(i.test)
      n()
    })

    instance.plugin((i, o, n) => {
      try {
        i.addServerMethod('otherTest', () => {}, ['test'])
        t.ok(i.test)
        t.ok(i.otherTest)
        n()
      } catch (e) {
        t.fail()
      }
    })

    instance.get('/', (req, reply) => {
      t.ok(instance.test)
      t.ok(instance.otherTest)
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
    t.notOk(fastify.otherTest)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

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
})

test('check dependencies - should throw', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.plugin((i, o, n) => {
      try {
        i.addServerMethod('otherTest', () => {}, ['test'])
        t.fail()
      } catch (e) {
        t.is(e.message, 'Fastify plugin: missing dependency: \'test\'.')
      }
      n()
    })

    instance.plugin((i, o, n) => {
      i.addServerMethod('test', () => {})
      t.ok(i.test)
      t.notOk(i.otherTest)
      n()
    })

    instance.get('/', (req, reply) => {
      t.ok(instance.test)
      t.notOk(instance.otherTest)
      reply.send({ hello: 'world' })
    })

    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

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
})

test('plugin incapsulation', t => {
  t.plan(10)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.plugin((i, o, n) => {
      i.addServerMethod('test', 'first')
      n()
    })

    instance.get('/first', (req, reply) => {
      reply.send({ plugin: instance.test })
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    instance.plugin((i, o, n) => {
      i.addServerMethod('test', 'second')
      n()
    })

    instance.get('/second', (req, reply) => {
      reply.send({ plugin: instance.test })
    })

    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
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
      t.deepEqual(JSON.parse(body), { plugin: 'first' })
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { plugin: 'second' })
    })
  })
})
