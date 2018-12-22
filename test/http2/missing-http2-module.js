'use strict'

const t = require('tap')
const test = t.test
const proxyquire = require('proxyquire')
const Fastify = proxyquire('../..', { http2: null })

test('should throw when http2 module cannot be found', t => {
  t.plan(1)
  try {
    Fastify({ http2: true })
    t.fail('fastify did not throw expected error')
  } catch (err) {
    t.equal(err.message, 'FST_ERR_HTTP2_INVALID_VERSION: HTTP2 is available only from node >= 8.8.1')
  }
})
