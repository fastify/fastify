'use strict'

const { test } = require('node:test')
const proxyquire = require('proxyquire')
const server = proxyquire('../../lib/server', { 'node:http2': null })
const Fastify = proxyquire('../..', { './lib/server.js': server })

test('should throw when http2 module cannot be found', t => {
  t.plan(2)
  try {
    Fastify({ http2: true })
    t.assert.fail('fastify did not throw expected error')
  } catch (err) {
    t.assert.strictEqual(err.code, 'FST_ERR_HTTP2_INVALID_VERSION')
    t.assert.strictEqual(err.message, 'HTTP2 is available only from node >= 8.8.1')
  }
})
