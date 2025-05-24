'use strict'

const { test } = require('node:test')
const { connect, HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = require('node:http2')
const Fastify = require('../..')
const { getServerUrl } = require('../helper')
const { once } = require('node:events')

test('should throws NGHTTP2_REFUSED_STREAM and close sessions', async t => {
  t.plan(2)
  const fastify = Fastify({ http2: true, http2SessionTimeout: 100 })
  fastify.get('/', () => 'hello world')
  await fastify.listen()
  const client = connect(getServerUrl(fastify))
  const req = client.request({
    [HTTP2_HEADER_PATH]: '/',
    [HTTP2_HEADER_METHOD]: 'GET'
  })
  await once(req, 'response')
  fastify.close()
  const r2 = client.request({
    [HTTP2_HEADER_PATH]: '/',
    [HTTP2_HEADER_METHOD]: 'GET'
  })
  r2.on('error', (err) => {
    t.assert.strictEqual(err.toString(), 'Error [ERR_HTTP2_STREAM_ERROR]: Stream closed with error code NGHTTP2_REFUSED_STREAM')
  })
  await once(r2, 'error')
  r2.end()
  t.assert.strictEqual(client.closed, true)
  client.destroy()
})
