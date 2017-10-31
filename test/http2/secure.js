'use strict'

const t = require('tap')
const test = t.test
const fs = require('fs')
const path = require('path')
const Fastify = require('../..')
const h2url = require('h2url')
const msg = { hello: 'world' }

var fastify
try {
  fastify = Fastify({
    http2: true,
    https: {
      key: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.key')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'https', 'fastify.cert'))
    }
  })
  t.pass('Key/cert successfully loaded')
} catch (e) {
  t.fail('Key/cert loading failed', e)
}

fastify.get('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('https get request', async (t) => {
    t.plan(3)

    const url = `https://localhost:${fastify.server.address().port}`
    const res = await h2url.concat({ url })

    t.strictEqual(res.headers[':status'], 200)
    t.strictEqual(res.headers['content-length'], '' + JSON.stringify(msg).length)
    t.deepEqual(JSON.parse(res.body), msg)
  })
})
