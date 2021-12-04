'use strict'

const http = require('http')
const test = require('tap').test
const fastify = require('../')

function getUrl (app) {
  const { address, port } = app.server.address()
  if (address === '::1') {
    return `http://[${address}]:${port}`
  } else {
    return `http://${address}:${port}`
  }
}

test('handlers receive correct `this` context', (t) => {
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

  instance.listen(0, (err) => {
    instance.server.unref()
    if (err) t.threw(err)
    t.ok(instance.foo)
    t.equal(instance.foo, 'foo')

    http.get(getUrl(instance), () => {}).on('error', t.threw)
  })
})

test('handlers have access to the internal context', (t) => {
  t.plan(5)

  const instance = fastify()
  instance.get('/', { config: { foo: 'bar' } }, function (req, reply) {
    t.ok(reply.context)
    t.ok(reply.context.config)
    t.type(reply.context.config, Object)
    t.ok(reply.context.config.foo)
    t.equal(reply.context.config.foo, 'bar')
    reply.send()
  })

  instance.listen(0, (err) => {
    instance.server.unref()
    if (err) t.threw(err)
    http.get(getUrl(instance), () => {}).on('error', t.threw)
  })
})
