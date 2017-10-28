'use strict'

const t = require('tap')
const test = t.test
const fs = require('fs')
const path = require('path')
const Fastify = require('../..')
const http2 = require('http2')
const sget = require('simple-get').concat
const msg = { hello: 'world' }

var fastify
try {
  fastify = Fastify({
    http2: true,
    https: {
      allowHTTP1: true,
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

  test('https get request', t => {
    t.plan(3)

    const client = http2.connect(`https://localhost:${fastify.server.address().port}`, {
      rejectUnauthorized: false
    })

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

  test('http1 get request', t => {
    t.plan(4)
    sget({
      method: 'GET',
      url: 'https://localhost:' + fastify.server.address().port,
      rejectUnauthorized: false
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
