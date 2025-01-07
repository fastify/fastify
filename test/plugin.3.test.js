'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const sget = require('simple-get').concat
const fp = require('fastify-plugin')

test('if a plugin raises an error and there is not a callback to handle it, the server must not start', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    done(new Error('err'))
  })

  fastify.listen({ port: 0 }, err => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'err')
  })
})

test('add hooks after route declaration', t => {
  t.plan(3)
  const fastify = Fastify()

  function plugin (instance, opts, done) {
    instance.decorateRequest('check', null)
    instance.addHook('onRequest', (req, reply, done) => {
      req.check = {}
      done()
    })
    setImmediate(done)
  }
  fastify.register(fp(plugin))

  fastify.register((instance, options, done) => {
    instance.addHook('preHandler', function b (req, res, done) {
      req.check.hook2 = true
      done()
    })

    instance.get('/', (req, reply) => {
      reply.send(req.check)
    })

    instance.addHook('preHandler', function c (req, res, done) {
      req.check.hook3 = true
      done()
    })

    done()
  })

  fastify.addHook('preHandler', function a (req, res, done) {
    req.check.hook1 = true
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.same(JSON.parse(body), { hook1: true, hook2: true, hook3: true })
      fastify.close()
    })
  })
})

test('nested plugins', t => {
  t.plan(5)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.register(function (fastify, opts, done) {
    fastify.register((fastify, opts, done) => {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 1')
      })
      done()
    }, { prefix: '/child1' })

    fastify.register((fastify, opts, done) => {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 2')
      })
      done()
    }, { prefix: '/child2' })

    done()
  }, { prefix: '/parent' })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child1'
    }, (err, response, body) => {
      t.error(err)
      t.same(body.toString(), 'I am child 1')
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child2'
    }, (err, response, body) => {
      t.error(err)
      t.same(body.toString(), 'I am child 2')
    })
  })
})

test('nested plugins awaited', t => {
  t.plan(5)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.register(async function wrap (fastify, opts) {
    await fastify.register(async function child1 (fastify, opts) {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 1')
      })
    }, { prefix: '/child1' })

    await fastify.register(async function child2 (fastify, opts) {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 2')
      })
    }, { prefix: '/child2' })
  }, { prefix: '/parent' })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child1'
    }, (err, response, body) => {
      t.error(err)
      t.same(body.toString(), 'I am child 1')
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child2'
    }, (err, response, body) => {
      t.error(err)
      t.same(body.toString(), 'I am child 2')
    })
  })
})

test('plugin metadata - decorators', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.decorate('plugin1', true)
  fastify.decorateReply('plugin1', true)
  fastify.decorateRequest('plugin1', true)

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    decorators: {
      fastify: ['plugin1'],
      reply: ['plugin1'],
      request: ['plugin1']
    }
  }

  fastify.register(plugin)

  fastify.ready(() => {
    t.ok(fastify.plugin)
  })

  function plugin (instance, opts, done) {
    instance.decorate('plugin', true)
    done()
  }
})

test('plugin metadata - decorators - should throw', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.decorate('plugin1', true)
  fastify.decorateReply('plugin1', true)

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    decorators: {
      fastify: ['plugin1'],
      reply: ['plugin1'],
      request: ['plugin1']
    }
  }

  fastify.register(plugin)
  fastify.ready((err) => {
    t.equal(err.message, "The decorator 'plugin1' is not present in Request")
  })

  function plugin (instance, opts, done) {
    instance.decorate('plugin', true)
    done()
  }
})

test('plugin metadata - decorators - should throw with plugin name', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.decorate('plugin1', true)
  fastify.decorateReply('plugin1', true)

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'the-plugin',
    decorators: {
      fastify: ['plugin1'],
      reply: ['plugin1'],
      request: ['plugin1']
    }
  }

  fastify.register(plugin)
  fastify.ready((err) => {
    t.equal(err.message, "The decorator 'plugin1' required by 'the-plugin' is not present in Request")
  })

  function plugin (instance, opts, done) {
    instance.decorate('plugin', true)
    done()
  }
})

test('plugin metadata - dependencies', t => {
  t.plan(1)
  const fastify = Fastify()

  dependency[Symbol.for('skip-override')] = true
  dependency[Symbol.for('plugin-meta')] = {
    name: 'plugin'
  }

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    dependencies: ['plugin']
  }

  fastify.register(dependency)
  fastify.register(plugin)

  fastify.ready(() => {
    t.pass('everything right')
  })

  function dependency (instance, opts, done) {
    done()
  }

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - dependencies (nested)', t => {
  t.plan(1)
  const fastify = Fastify()

  dependency[Symbol.for('skip-override')] = true
  dependency[Symbol.for('plugin-meta')] = {
    name: 'plugin'
  }

  nested[Symbol.for('skip-override')] = true
  nested[Symbol.for('plugin-meta')] = {
    dependencies: ['plugin']
  }

  fastify.register(dependency)
  fastify.register(plugin)

  fastify.ready(() => {
    t.pass('everything right')
  })

  function dependency (instance, opts, done) {
    done()
  }

  function plugin (instance, opts, done) {
    instance.register(nested)
    done()
  }

  function nested (instance, opts, done) {
    done()
  }
})
