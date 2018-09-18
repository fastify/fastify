'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
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

test('fastify.register with fastify-plugin should not incapsulate his code', t => {
  t.plan(10)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
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

    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
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
  })
})

test('fastify.register with fastify-plugin registers root level plugins', t => {
  t.plan(15)
  const fastify = Fastify()

  function rootPlugin (instance, opts, next) {
    instance.decorate('test', 'first')
    t.ok(instance.test)
    next()
  }

  function innerPlugin (instance, opts, next) {
    instance.decorate('test2', 'second')
    next()
  }

  fastify.register(fp(rootPlugin))

  fastify.register((instance, opts, next) => {
    t.ok(instance.test)
    instance.register(fp(innerPlugin))

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

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { test: 'first' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/test2'
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
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

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { plugin: 'first' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { plugin: 'second' })
    })
  })
})

test('if a plugin raises an error and there is not a callback to handle it, the server must not start', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    next(new Error('err'))
  })

  fastify.listen(0, err => {
    t.ok(err instanceof Error)
    t.is(err.message, 'err')
  })
})

test('add hooks after route declaration', t => {
  t.plan(3)
  const fastify = Fastify()

  function plugin (instance, opts, next) {
    instance.decorateRequest('check', {})
    setImmediate(next)
  }
  fastify.register(fp(plugin))

  fastify.register((instance, options, next) => {
    instance.addHook('preHandler', function b (req, res, next) {
      req.check.hook2 = true
      next()
    })

    instance.get('/', (req, reply) => {
      reply.send(req.check)
    })

    instance.addHook('preHandler', function c (req, res, next) {
      req.check.hook3 = true
      next()
    })

    next()
  })

  fastify.addHook('preHandler', function a (req, res, next) {
    req.check.hook1 = true
    next()
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.deepEqual(JSON.parse(body), { hook1: true, hook2: true, hook3: true })
      fastify.close()
    })
  })
})

test('nested plugins', t => {
  t.plan(5)

  const fastify = Fastify()

  t.tearDown(fastify.close.bind(fastify))

  fastify.register(function (fastify, opts, next) {
    fastify.register((fastify, opts, next) => {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 1')
      })
      next()
    }, { prefix: '/child1' })

    fastify.register((fastify, opts, next) => {
      fastify.get('/', function (req, reply) {
        reply.send('I am child 2')
      })
      next()
    }, { prefix: '/child2' })

    next()
  }, { prefix: '/parent' })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child1'
    }, (err, response, body) => {
      t.error(err)
      t.deepEqual(body.toString(), 'I am child 1')
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/parent/child2'
    }, (err, response, body) => {
      t.error(err)
      t.deepEqual(body.toString(), 'I am child 2')
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

  function plugin (instance, opts, next) {
    instance.decorate('plugin', true)
    next()
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

  function dependency (instance, opts, next) {
    next()
  }

  function plugin (instance, opts, next) {
    next()
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

  function dependency (instance, opts, next) {
    next()
  }

  function plugin (instance, opts, next) {
    instance.register(nested)
    next()
  }

  function nested (instance, opts, next) {
    next()
  }
})

test('pluginTimeout', t => {
  t.plan(2)
  const fastify = Fastify({
    pluginTimeout: 10
  })
  fastify.register(function (app, opts, next) {
    // to no call next on purpose
  })
  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.code, 'ERR_AVVIO_PLUGIN_TIMEOUT')
  })
})
