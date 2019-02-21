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

    const url = `http://127.0.0.1:${fastify.server.address().port}`
    http2.connect(url, function () {
      fastify.close()
      this.request({
        ':method': 'GET',
        ':path': '/'
      }).on('response', headers => {
        t.strictEqual(headers[':status'], 503)
        this.destroy()
      }).on('error', () => {
        // This might happen instead of the 503,
        // we don't have much to control what happens in
        // this case. It might be a Node core fault
        t.pass('connection errored')
      })
      this.on('error', () => {
        // Nothing to do here,
        // we are not interested in this error that might
        // happen or not
      })
    })
  })
})
