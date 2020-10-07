'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const Fastify = proxyquire('../..', { fs: { accessSync: () => false } })

test('should output an undefined version in case of package.json not available', t => {
  t.plan(1)
  const srv = Fastify()
  t.is(srv.version, undefined)
})
