'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')

test('should output an undefined version in case of package.json not available', t => {
  const Fastify = proxyquire('../..', { fs: { accessSync: () => { throw Error('error') } } })
  t.plan(1)
  const srv = Fastify()
  t.equal(srv.version, undefined)
})

test('should output an undefined version in case of package.json is not the fastify one', t => {
  const Fastify = proxyquire('../..', { fs: { accessSync: () => { }, readFileSync: () => JSON.stringify({ name: 'foo', version: '6.6.6' }) } })
  t.plan(1)
  const srv = Fastify()
  t.equal(srv.version, undefined)
})

test('should skip the version check if the version is undefined', t => {
  const Fastify = proxyquire('../..', { fs: { accessSync: () => { }, readFileSync: () => JSON.stringify({ name: 'foo', version: '6.6.6' }) } })
  t.plan(3)
  const srv = Fastify()
  t.equal(srv.version, undefined)

  plugin[Symbol.for('skip-override')] = false
  plugin[Symbol.for('plugin-meta')] = {
    name: 'plugin',
    fastify: '>=99.0.0'
  }

  srv.register(plugin)

  srv.ready((err) => {
    t.error(err)
    t.pass('everything right')
  })

  function plugin (instance, opts, done) {
    done()
  }
})
