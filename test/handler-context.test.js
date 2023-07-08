'use strict'
const test = require('tap').test
const { kRouteContext } = require('../lib/symbols')
const fastify = require('../')

test('handlers receive correct `this` context', async (t) => {
  t.plan(4)

  // simulate plugin that uses fastify-plugin
  const plugin = function (instance, opts, done) {
    instance.decorate('foo', 'foo')
    done()
  }
  plugin[Symbol.for('skip-override')] = true

  const instance = fastify()
  instance.register(plugin)

  instance.get('/', function (req, reply) {
    t.ok(this.foo)
    t.equal(this.foo, 'foo')
    reply.send()
  })

  await instance.inject('/')

  t.ok(instance.foo)
  t.equal(instance.foo, 'foo')
})

test('handlers have access to the internal context', async (t) => {
  t.plan(5)

  const instance = fastify()
  instance.get('/', { config: { foo: 'bar' } }, function (req, reply) {
    t.ok(reply[kRouteContext])
    t.ok(reply[kRouteContext].config)
    t.type(reply[kRouteContext].config, Object)
    t.ok(reply[kRouteContext].config.foo)
    t.equal(reply[kRouteContext].config.foo, 'bar')
    reply.send()
  })

  await instance.inject('/')
})
