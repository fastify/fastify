'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const http2 = require('http2')
const msg = { hello: 'world' }

var fastify
try {
  fastify = Fastify({
    http2: true
  })
  t.pass('http2 successfully loaded')
} catch (e) {
  t.fail('http2 loading failed', e)
}

fastify.get('/', function (req, reply) {
  reply.code(200).send(msg)
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('http get request', t => {
    t.plan(3)

    const client = http2.connect(`http://localhost:${fastify.server.address().port}`)

    const req = client.request({ ':path': '/' })

    req.on('response', (headers) => {
      t.strictEqual(headers[':status'], 200)
      t.strictEqual(headers['content-length'], '' + JSON.stringify(msg).length)
    })

    let data = ''
    req.setEncoding('utf8')
    req.on('data', (d) => { data += d })
    req.on('end', () => {
      t.deepEqual(JSON.parse(data), msg)
      client.destroy()
    })
    req.end()
  })
})
