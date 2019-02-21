'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const http2 = require('http2')

let fastify
try {
  fastify = Fastify({
    http2: true
  })
  t.pass('http2 successfully loaded')
} catch (e) {
  t.fail('http2 loading failed', e)
}

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('http/2 request while fastify closing', t => {
    t.plan(1)

    const url = `http://localhost:${fastify.server.address().port}`
    http2.connect(url, function () {
      fastify.close()
      this.request({
        ':method': 'GET',
        ':path': '/'
      }).on('response', headers => {
        t.strictEqual(headers[':status'], 503)
        this.destroy()
      })
    })
  })
})
