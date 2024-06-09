'use strict'

/* eslint no-prototype-builtins: 0 */

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const sget = require('simple-get').concat
const fp = require('fastify-plugin')

test('require a plugin', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.register(require('./plugin.helper'))
  fastify.ready(() => {
    t.ok(fastify.test)
  })
})

test('plugin metadata - ignore prefix', t => {
  t.plan(2)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  fastify.register(plugin, { prefix: 'foo' })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, function (err, res) {
    t.error(err)
    t.equal(res.payload, 'hello')
  })

  function plugin (instance, opts, done) {
    instance.get('/', function (request, reply) {
      reply.send('hello')
    })
    done()
  }
})

test('plugin metadata - naming plugins', async t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(require('./plugin.name.display'))
  fastify.register(function (fastify, opts, done) {
    // one line
    t.equal(fastify.pluginName, 'function (fastify, opts, done) { -- // one line')
    done()
  })
  fastify.register(function fooBar (fastify, opts, done) {
    t.equal(fastify.pluginName, 'fooBar')
    done()
  })

  await fastify.ready()
})

test('fastify.register with fastify-plugin should not encapsulate his code', t => {
  t.plan(10)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.ok(i.test)
      n()
    }))

    t.notOk(instance.test)

    // the decoration is added at the end
    instance.after(() => {
      t.ok(instance.test)
    })

    instance.get('/', (req, reply) => {
      t.ok(instance.test)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('fastify.register with fastify-plugin should provide access to external fastify instance if opts argument is a function', t => {
  t.plan(22)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      i.decorate('global', () => {})
      t.ok(i.global)
      n()
    }))

    instance.register((i, o, n) => n(), p => {
      t.notOk(p === instance || p === fastify)
      t.ok(instance.isPrototypeOf(p))
      t.ok(fastify.isPrototypeOf(p))
      t.ok(p.global)
    })

    instance.register((i, o, n) => {
      i.decorate('local', () => {})
      n()
    })

    instance.register((i, o, n) => n(), p => t.notOk(p.local))

    instance.register((i, o, n) => {
      t.ok(i.local)
      n()
    }, p => p.decorate('local', () => {}))

    instance.register((i, o, n) => n(), p => t.notOk(p.local))

    instance.register(fp((i, o, n) => {
      t.ok(i.global_2)
      n()
    }), p => p.decorate('global_2', () => 'hello'))

    instance.register((i, o, n) => {
      i.decorate('global_2', () => 'world')
      n()
    }, p => p.get('/', (req, reply) => {
      t.ok(p.global_2)
      reply.send({ hello: p.global_2() })
    }))

    t.notOk(instance.global)
    t.notOk(instance.global_2)
    t.notOk(instance.local)

    // the decoration is added at the end
    instance.after(() => {
      t.ok(instance.global)
      t.equal(instance.global_2(), 'hello')
      t.notOk(instance.local)
    })

    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.global)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('fastify.register with fastify-plugin registers fastify level plugins', t => {
  t.plan(15)
  const fastify = Fastify()

  function fastifyPlugin (instance, opts, done) {
    instance.decorate('test', 'first')
    t.ok(instance.test)
    done()
  }

  function innerPlugin (instance, opts, done) {
    instance.decorate('test2', 'second')
    done()
  }

  fastify.register(fp(fastifyPlugin))

  fastify.register((instance, opts, done) => {
    t.ok(instance.test)
    instance.register(fp(innerPlugin))

    instance.get('/test2', (req, reply) => {
      t.ok(instance.test2)
      reply.send({ test2: instance.test2 })
    })

    done()
  })

  fastify.ready(() => {
    t.ok(fastify.test)
    t.notOk(fastify.test2)
  })

  fastify.get('/', (req, reply) => {
    t.ok(fastify.test)
    reply.send({ test: fastify.test })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { test: 'first' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/test2'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { test2: 'second' })
    })
  })
})
