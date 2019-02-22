'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const http2 = require('http2')
const semver = require('semver')

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

  // Skipped because there is likely a bug on Node 8.
  test('http/2 request while fastify closing', { skip: semver.lt(process.versions.node, '10.15.0') }, t => {
    const url = `http://127.0.0.1:${fastify.server.address().port}`
    const session = http2.connect(url, function () {
      this.request({
        ':method': 'GET',
        ':path': '/'
      }).on('response', headers => {
        t.strictEqual(headers[':status'], 503)
        t.end()
        this.destroy()
      }).on('error', () => {
        // Nothing to do here,
        // we are not interested in this error that might
        // happen or not
      })
      fastify.close()
    })
    session.on('error', () => {
      // Nothing to do here,
      // we are not interested in this error that might
      // happen or not
      t.end()
    })
  })
})
