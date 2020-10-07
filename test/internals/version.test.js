'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const Fastify = proxyquire('../..', { fs: { accessSync: () => { throw Error('error') } } })
const Fastify2 = proxyquire('../..', { fs: { accessSync: () => { }, readFileSync: () => JSON.stringify({ name: 'foo', version: '6.6.6' }) } })

test('should output an undefined version in case of package.json not available', t => {
  t.plan(1)
  const srv = Fastify()
  t.is(srv.version, undefined)
})

test('should output an undefined version in case of package.json is not the fastify one', t => {
  t.plan(1)
  const srv = Fastify2()
  t.is(srv.version, undefined)
})
