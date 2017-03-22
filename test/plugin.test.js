'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const request = require('request')
const fp = require('fastify-plugin')

test('require a plugin', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(require('./plugin.helper'))
  fastify.ready(() => {
    t.ok(fastify.test)
  })
})

test('fastify.register with fastify-plugin should not incapsulate his code', t => {
  t.plan(9)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.ok(i.test)
      n()
    }))

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

test('check dependencies - should not throw', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.ok(i.test)
      n()
    }))

    instance.register(fp((i, o, n) => {
      try {
        i.decorate('otherTest', () => {}, ['test'])
        t.ok(i.test)
        t.ok(i.otherTest)
        n()
      } catch (e) {
        t.fail()
      }
    }))

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
    instance.register(fp((i, o, n) => {
      try {
        i.decorate('otherTest', () => {}, ['test'])
        t.fail()
      } catch (e) {
        t.is(e.message, 'Fastify decorator: missing dependency: \'test\'.')
      }
      n()
    }))

    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.ok(i.test)
      t.notOk(i.otherTest)
      n()
    }))

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
    instance.register(fp((i, o, n) => {
      i.decorate('test', 'first')
      n()
    }))

    instance.get('/first', (req, reply) => {
      reply.send({ plugin: instance.test })
    })

    next()
  })

  fastify.register((instance, opts, next) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', 'second')
      n()
    }))

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
