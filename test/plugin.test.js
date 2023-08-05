'use strict'

/* eslint no-prototype-builtins: 0 */

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat
const fp = require('fastify-plugin')
const fakeTimer = require('@sinonjs/fake-timers')

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

test('check dependencies - should not throw', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
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

    done()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
    t.notOk(fastify.otherTest)
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

test('check dependencies - should throw', t => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      try {
        i.decorate('otherTest', () => {}, ['test'])
        t.fail()
      } catch (e) {
        t.equal(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
        t.equal(e.message, 'The decorator is missing dependency \'test\'.')
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

test('set the plugin name based on the plugin displayName symbol', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fp((fastify, opts, done) => {
    t.equal(fastify.pluginName, 'fastify -> plugin-A')
    fastify.register(fp((fastify, opts, done) => {
      t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB')
      done()
    }, { name: 'plugin-AB' }))
    fastify.register(fp((fastify, opts, done) => {
      t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      done()
    }, { name: 'plugin-AC' }))
    done()
  }, { name: 'plugin-A' }))

  fastify.register(fp((fastify, opts, done) => {
    t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC -> plugin-B')
    done()
  }, { name: 'plugin-B' }))

  t.equal(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('plugin name will change when using no encapsulation', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.register(fp((fastify, opts, done) => {
    // store it in a different variable will hold the correct name
    const pluginName = fastify.pluginName
    fastify.register(fp((fastify, opts, done) => {
      t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB')
      done()
    }, { name: 'plugin-AB' }))
    fastify.register(fp((fastify, opts, done) => {
      t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      done()
    }, { name: 'plugin-AC' }))
    setImmediate(() => {
      // normally we would expect the name plugin-A
      // but we operate on the same instance in each plugin
      t.equal(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      t.equal(pluginName, 'fastify -> plugin-A')
    })
    done()
  }, { name: 'plugin-A' }))

  t.equal(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('plugin name is undefined when accessing in no plugin context', t => {
  t.plan(2)
  const fastify = Fastify()

  t.equal(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('set the plugin name based on the plugin function name', t => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(function myPluginA (fastify, opts, done) {
    t.equal(fastify.pluginName, 'myPluginA')
    fastify.register(function myPluginAB (fastify, opts, done) {
      t.equal(fastify.pluginName, 'myPluginAB')
      done()
    })
    setImmediate(() => {
      // exact name due to encapsulation
      t.equal(fastify.pluginName, 'myPluginA')
    })
    done()
  })

  fastify.register(function myPluginB (fastify, opts, done) {
    t.equal(fastify.pluginName, 'myPluginB')
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('approximate a plugin name when no meta data is available', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.register((fastify, opts, done) => {
    // A
    t.equal(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
    t.equal(fastify.pluginName.includes('// A'), true)
    fastify.register((fastify, opts, done) => {
      // B
      t.equal(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
      t.equal(fastify.pluginName.includes('// B'), true)
      done()
    })
    setImmediate(() => {
      t.equal(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
      t.equal(fastify.pluginName.includes('// A'), true)
    })
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('approximate a plugin name also when fastify-plugin has no meta data', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fp((fastify, opts, done) => {
    t.match(fastify.pluginName, /plugin\.test/)
    fastify.register(fp(function B (fastify, opts, done) {
      // function has name
      t.match(fastify.pluginName, /plugin\.test-auto-\d+ -> B/)
      done()
    }))
    setImmediate(() => {
      t.match(fastify.pluginName, /plugin\.test-auto-\d+ -> B/)
    })
    done()
  }))

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    fastify.close()
  })
})

test('plugin encapsulation', t => {
  t.plan(10)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', 'first')
      n()
    }))

    instance.get('/first', (req, reply) => {
      reply.send({ plugin: instance.test })
    })

    done()
  })

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', 'second')
      n()
    }))

    instance.get('/second', (req, reply) => {
      reply.send({ plugin: instance.test })
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
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { plugin: 'first' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { plugin: 'second' })
    })
  })
})

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

test('pluginTimeout', t => {
  t.plan(5)
  const fastify = Fastify({
    pluginTimeout: 10
  })
  fastify.register(function (app, opts, done) {
    // to no call done on purpose
  })
  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.message,
      "fastify-plugin: Plugin did not start in time: 'function (app, opts, done) { -- // to no call done on purpose'. You may have forgotten to call 'done' function or to resolve a Promise")
    t.equal(err.code, 'FST_ERR_PLUGIN_TIMEOUT')
    t.ok(err.cause)
    t.equal(err.cause.code, 'AVV_ERR_READY_TIMEOUT')
  })
})

test('pluginTimeout - named function', t => {
  t.plan(5)
  const fastify = Fastify({
    pluginTimeout: 10
  })
  fastify.register(function nameFunction (app, opts, done) {
    // to no call done on purpose
  })
  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.message,
      "fastify-plugin: Plugin did not start in time: 'nameFunction'. You may have forgotten to call 'done' function or to resolve a Promise")
    t.equal(err.code, 'FST_ERR_PLUGIN_TIMEOUT')
    t.ok(err.cause)
    t.equal(err.cause.code, 'AVV_ERR_READY_TIMEOUT')
  })
})

test('pluginTimeout default', t => {
  t.plan(5)
  const clock = fakeTimer.install({ shouldClearNativeTimers: true })

  const fastify = Fastify()
  fastify.register(function (app, opts, done) {
    // default time elapsed without calling done
    clock.tick(10000)
  })

  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.message,
      "fastify-plugin: Plugin did not start in time: 'function (app, opts, done) { -- // default time elapsed without calling done'. You may have forgotten to call 'done' function or to resolve a Promise")
    t.equal(err.code, 'FST_ERR_PLUGIN_TIMEOUT')
    t.ok(err.cause)
    t.equal(err.cause.code, 'AVV_ERR_READY_TIMEOUT')
  })

  t.teardown(clock.uninstall)
})

test('plugin metadata - version', t => {
  t.plan(1)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '2.0.0'
  }

  fastify.register(plugin)

  fastify.ready(() => {
    t.pass('everything right')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - version range', t => {
  t.plan(1)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '>=2.0.0'
  }

  fastify.register(plugin)

  fastify.ready(() => {
    t.pass('everything right')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - version not matching requirement', t => {
  t.plan(2)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '99.0.0'
  }

  fastify.register(plugin)

  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.code, 'FST_ERR_PLUGIN_VERSION_MISMATCH')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - version not matching requirement 2', t => {
  t.plan(2)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '<=3.0.0'
  }

  fastify.register(plugin)

  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.code, 'FST_ERR_PLUGIN_VERSION_MISMATCH')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - version not matching requirement 3', t => {
  t.plan(2)
  const fastify = Fastify()

  plugin[Symbol.for('skip-override')] = true
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '>=99.0.0'
  }

  fastify.register(plugin)

  fastify.ready((err) => {
    t.ok(err)
    t.equal(err.code, 'FST_ERR_PLUGIN_VERSION_MISMATCH')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('plugin metadata - release candidate', t => {
  t.plan(2)
  const fastify = Fastify()
  Object.defineProperty(fastify, 'version', {
    value: '99.0.0-rc.1'
  })

  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '99.x'
  }

  fastify.register(plugin)

  fastify.ready((err) => {
    t.error(err)
    t.pass('everything right')
  })

  function plugin (instance, opts, done) {
    done()
  }
})

test('fastify-rc loads prior version plugins', t => {
  t.plan(2)
  const fastify = Fastify()
  Object.defineProperty(fastify, 'version', {
    value: '99.0.0-rc.1'
  })

  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '^98.1.0'
  }
  plugin2[Symbol.for('plugin-meta')] = {
    name: 'plugin2',
    fastify: '98.x'
  }

  fastify.register(plugin)

  fastify.ready((err) => {
    t.error(err)
    t.pass('everything right')
  })

  function plugin (instance, opts, done) {
    done()
  }

  function plugin2 (instance, opts, done) {
    done()
  }
})

test('hasPlugin method exists as a function', t => {
  t.plan(1)

  const fastify = Fastify()
  t.equal(typeof fastify.hasPlugin, 'function')
})

test('hasPlugin returns true if the specified plugin has been registered', async t => {
  t.plan(4)

  const fastify = Fastify()

  function pluginA (fastify, opts, done) {
    t.ok(fastify.hasPlugin('plugin-A'))
    done()
  }
  pluginA[Symbol.for('fastify.display-name')] = 'plugin-A'
  fastify.register(pluginA)

  fastify.register(function pluginB (fastify, opts, done) {
    t.ok(fastify.hasPlugin('pluginB'))
    done()
  })

  fastify.register(function (fastify, opts, done) {
    // one line
    t.ok(fastify.hasPlugin('function (fastify, opts, done) { -- // one line'))
    done()
  })

  await fastify.ready()

  t.ok(fastify.hasPlugin('fastify'))
})

test('hasPlugin returns false if the specified plugin has not been registered', t => {
  t.plan(1)

  const fastify = Fastify()
  t.notOk(fastify.hasPlugin('pluginFoo'))
})

test('hasPlugin returns false when using encapsulation', async t => {
  t.plan(25)

  const fastify = Fastify()

  fastify.register(function pluginA (fastify, opts, done) {
    t.ok(fastify.hasPlugin('pluginA'))
    t.notOk(fastify.hasPlugin('pluginAA'))
    t.notOk(fastify.hasPlugin('pluginAAA'))
    t.notOk(fastify.hasPlugin('pluginAB'))
    t.notOk(fastify.hasPlugin('pluginB'))

    fastify.register(function pluginAA (fastify, opts, done) {
      t.notOk(fastify.hasPlugin('pluginA'))
      t.ok(fastify.hasPlugin('pluginAA'))
      t.notOk(fastify.hasPlugin('pluginAAA'))
      t.notOk(fastify.hasPlugin('pluginAB'))
      t.notOk(fastify.hasPlugin('pluginB'))

      fastify.register(function pluginAAA (fastify, opts, done) {
        t.notOk(fastify.hasPlugin('pluginA'))
        t.notOk(fastify.hasPlugin('pluginAA'))
        t.ok(fastify.hasPlugin('pluginAAA'))
        t.notOk(fastify.hasPlugin('pluginAB'))
        t.notOk(fastify.hasPlugin('pluginB'))

        done()
      })

      done()
    })

    fastify.register(function pluginAB (fastify, opts, done) {
      t.notOk(fastify.hasPlugin('pluginA'))
      t.notOk(fastify.hasPlugin('pluginAA'))
      t.notOk(fastify.hasPlugin('pluginAAA'))
      t.ok(fastify.hasPlugin('pluginAB'))
      t.notOk(fastify.hasPlugin('pluginB'))

      done()
    })

    done()
  })

  fastify.register(function pluginB (fastify, opts, done) {
    t.notOk(fastify.hasPlugin('pluginA'))
    t.notOk(fastify.hasPlugin('pluginAA'))
    t.notOk(fastify.hasPlugin('pluginAAA'))
    t.notOk(fastify.hasPlugin('pluginAB'))
    t.ok(fastify.hasPlugin('pluginB'))

    done()
  })

  await fastify.ready()
})

test('hasPlugin returns true when using no encapsulation', async t => {
  t.plan(26)

  const fastify = Fastify()

  fastify.register(fp((fastify, opts, done) => {
    t.equal(fastify.pluginName, 'fastify -> plugin-AA')
    t.ok(fastify.hasPlugin('plugin-AA'))
    t.notOk(fastify.hasPlugin('plugin-A'))
    t.notOk(fastify.hasPlugin('plugin-AAA'))
    t.notOk(fastify.hasPlugin('plugin-AB'))
    t.notOk(fastify.hasPlugin('plugin-B'))

    fastify.register(fp((fastify, opts, done) => {
      t.ok(fastify.hasPlugin('plugin-AA'))
      t.ok(fastify.hasPlugin('plugin-A'))
      t.notOk(fastify.hasPlugin('plugin-AAA'))
      t.notOk(fastify.hasPlugin('plugin-AB'))
      t.notOk(fastify.hasPlugin('plugin-B'))

      fastify.register(fp((fastify, opts, done) => {
        t.ok(fastify.hasPlugin('plugin-AA'))
        t.ok(fastify.hasPlugin('plugin-A'))
        t.ok(fastify.hasPlugin('plugin-AAA'))
        t.notOk(fastify.hasPlugin('plugin-AB'))
        t.notOk(fastify.hasPlugin('plugin-B'))

        done()
      }, { name: 'plugin-AAA' }))

      done()
    }, { name: 'plugin-A' }))

    fastify.register(fp((fastify, opts, done) => {
      t.ok(fastify.hasPlugin('plugin-AA'))
      t.ok(fastify.hasPlugin('plugin-A'))
      t.ok(fastify.hasPlugin('plugin-AAA'))
      t.ok(fastify.hasPlugin('plugin-AB'))
      t.notOk(fastify.hasPlugin('plugin-B'))

      done()
    }, { name: 'plugin-AB' }))

    done()
  }, { name: 'plugin-AA' }))

  fastify.register(fp((fastify, opts, done) => {
    t.ok(fastify.hasPlugin('plugin-AA'))
    t.ok(fastify.hasPlugin('plugin-A'))
    t.ok(fastify.hasPlugin('plugin-AAA'))
    t.ok(fastify.hasPlugin('plugin-AB'))
    t.ok(fastify.hasPlugin('plugin-B'))

    done()
  }, { name: 'plugin-B' }))

  await fastify.ready()
})

test('hasPlugin returns true when using encapsulation', async t => {
  t.plan(2)

  const fastify = Fastify()

  const pluginCallback = function (server, options, done) {
    done()
  }
  const pluginName = 'awesome-plugin'
  const plugin = fp(pluginCallback, { name: pluginName })

  fastify.register(plugin)

  fastify.register(async (server) => {
    t.ok(server.hasPlugin(pluginName))
  })

  fastify.register(async function foo (server) {
    server.register(async function bar (server) {
      t.ok(server.hasPlugin(pluginName))
    })
  })

  await fastify.ready()
})
