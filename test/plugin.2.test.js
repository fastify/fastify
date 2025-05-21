'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')
const sget = require('simple-get').concat
const fp = require('fastify-plugin')
const { waitForCb } = require('./toolkit')

test('check dependencies - should not throw', (t, testDone) => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.assert.ok(i.test)
      n()
    }))

    instance.register(fp((i, o, n) => {
      try {
        i.decorate('otherTest', () => {}, ['test'])
        t.assert.ok(i.test)
        t.assert.ok(i.otherTest)
        n()
      } catch (e) {
        t.assert.fail()
      }
    }))

    instance.get('/', (req, reply) => {
      t.assert.ok(instance.test)
      t.assert.ok(instance.otherTest)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.ready(() => {
    t.assert.ok(!fastify.test)
    t.assert.ok(!fastify.otherTest)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      testDone()
    })
  })
})

test('check dependencies - should throw', (t, testDone) => {
  t.plan(12)
  const fastify = Fastify()

  fastify.register((instance, opts, done) => {
    instance.register(fp((i, o, n) => {
      try {
        i.decorate('otherTest', () => {}, ['test'])
        t.assert.fail()
      } catch (e) {
        t.assert.strictEqual(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
        t.assert.strictEqual(e.message, 'The decorator is missing dependency \'test\'.')
      }
      n()
    }))

    instance.register(fp((i, o, n) => {
      i.decorate('test', () => {})
      t.assert.ok(i.test)
      t.assert.ok(!i.otherTest)
      n()
    }))

    instance.get('/', (req, reply) => {
      t.assert.ok(instance.test)
      t.assert.ok(!instance.otherTest)
      reply.send({ hello: 'world' })
    })

    done()
  })

  fastify.ready(() => {
    t.assert.ok(!fastify.test)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      testDone()
    })
  })
})

test('set the plugin name based on the plugin displayName symbol', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(fp((fastify, opts, done) => {
    t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A')
    fastify.register(fp((fastify, opts, done) => {
      t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB')
      done()
    }, { name: 'plugin-AB' }))
    fastify.register(fp((fastify, opts, done) => {
      t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      done()
    }, { name: 'plugin-AC' }))
    done()
  }, { name: 'plugin-A' }))

  fastify.register(fp((fastify, opts, done) => {
    t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC -> plugin-B')
    done()
  }, { name: 'plugin-B' }))

  t.assert.strictEqual(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('plugin name will change when using no encapsulation', (t, testDone) => {
  t.plan(6)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(fp((fastify, opts, done) => {
    // store it in a different variable will hold the correct name
    const pluginName = fastify.pluginName
    fastify.register(fp((fastify, opts, done) => {
      t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB')
      done()
    }, { name: 'plugin-AB' }))
    fastify.register(fp((fastify, opts, done) => {
      t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      done()
    }, { name: 'plugin-AC' }))
    setImmediate(() => {
      // normally we would expect the name plugin-A
      // but we operate on the same instance in each plugin
      t.assert.strictEqual(fastify.pluginName, 'fastify -> plugin-A -> plugin-AB -> plugin-AC')
      t.assert.strictEqual(pluginName, 'fastify -> plugin-A')
    })
    done()
  }, { name: 'plugin-A' }))

  t.assert.strictEqual(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('plugin name is undefined when accessing in no plugin context', (t, testDone) => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.strictEqual(fastify.pluginName, 'fastify')

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('set the plugin name based on the plugin function name', (t, testDone) => {
  t.plan(5)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(function myPluginA (fastify, opts, done) {
    t.assert.strictEqual(fastify.pluginName, 'myPluginA')
    fastify.register(function myPluginAB (fastify, opts, done) {
      t.assert.strictEqual(fastify.pluginName, 'myPluginAB')
      done()
    })
    setImmediate(() => {
      // exact name due to encapsulation
      t.assert.strictEqual(fastify.pluginName, 'myPluginA')
    })
    done()
  })

  fastify.register(function myPluginB (fastify, opts, done) {
    t.assert.strictEqual(fastify.pluginName, 'myPluginB')
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('approximate a plugin name when no meta data is available', (t, testDone) => {
  t.plan(7)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register((fastify, opts, done) => {
    // A
    t.assert.strictEqual(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
    t.assert.strictEqual(fastify.pluginName.includes('// A'), true)
    fastify.register((fastify, opts, done) => {
      // B
      t.assert.strictEqual(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
      t.assert.strictEqual(fastify.pluginName.includes('// B'), true)
      done()
    })
    setImmediate(() => {
      t.assert.strictEqual(fastify.pluginName.startsWith('(fastify, opts, done)'), true)
      t.assert.strictEqual(fastify.pluginName.includes('// A'), true)
    })
    done()
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('approximate a plugin name also when fastify-plugin has no meta data', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())

  // plugin name is got from current file name
  const pluginName = /plugin\.2\.test/
  const pluginNameWithFunction = /plugin\.2\.test-auto-\d+ -> B/

  fastify.register(fp((fastify, opts, done) => {
    t.assert.match(fastify.pluginName, pluginName)
    fastify.register(fp(function B (fastify, opts, done) {
      // function has name
      t.assert.match(fastify.pluginName, pluginNameWithFunction)
      done()
    }))
    setImmediate(() => {
      t.assert.match(fastify.pluginName, pluginNameWithFunction)
    })
    done()
  }))

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    testDone()
  })
})

test('plugin encapsulation', (t, testDone) => {
  t.plan(10)
  const fastify = Fastify()
  t.after(() => fastify.close())

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
    t.assert.ok(!fastify.test)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    t.after(() => { fastify.close() })

    const completion = waitForCb({
      steps: 2
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/first'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { plugin: 'first' })
      completion.stepIn()
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/second'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(response.headers['content-length'], '' + body.length)
      t.assert.deepStrictEqual(JSON.parse(body), { plugin: 'second' })
      completion.stepIn()
    })

    completion.patience.then(testDone)
  })
})
