'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const sget = require('simple-get').concat
const fp = require('fastify-plugin')

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
  // plugin name is got from current file name
  const pluginName = /plugin\.2\.test/
  const pluginNameWithFunction = /plugin\.2\.test-auto-\d+ -> B/

  fastify.register(fp((fastify, opts, done) => {
    t.match(fastify.pluginName, pluginName)
    fastify.register(fp(function B (fastify, opts, done) {
      // function has name
      t.match(fastify.pluginName, pluginNameWithFunction)
      done()
    }))
    setImmediate(() => {
      t.match(fastify.pluginName, pluginNameWithFunction)
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
