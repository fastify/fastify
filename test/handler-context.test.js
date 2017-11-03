'use strict'

const http = require('http')
const test = require('tap').test
const fastify = require('../')

test('handlers receive correct `this` context', (t) => {
  t.plan(4)

  // simulate plugin that uses fastify-plugin
  const plugin = function (instance, opts, next) {
    instance.decorate('foo', 'foo')
    next()
  }
  plugin[Symbol.for('skip-override')] = true

  const instance = fastify()
  instance.register(plugin, (err) => {
    if (err) t.threw(err)
  })

  instance.get('/', function (req, reply) {
    t.ok(this.foo)
    t.is(this.foo, 'foo')
    reply.send()
  })

  instance.listen(0, (err) => {
    instance.server.unref()
    if (err) t.threw(err)
    t.ok(instance.foo)
    t.is(instance.foo, 'foo')

    const address = `http://127.0.0.1:${instance.server.address().port}/`
    http.get(address, () => {}).on('error', t.threw)
  })
})
