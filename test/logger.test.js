'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const split = require('split2')
const Fastify = require('..')
var fastify = null
var stream = split(JSON.parse)

try {
  fastify = Fastify({
    logger: {
      stream: stream,
      level: 'info'
    }
  })
  t.pass()
} catch (e) {
  t.fail()
}

fastify.get('/', function (req, reply) {
  t.ok(req.req.log)
  reply(null, 200, { hello: 'world' })
})

test('test log stream', t => {
  t.plan(6)
  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    http.get('http://localhost:' + fastify.server.address().port)
    stream.on('data', line => {
      t.ok(line.req, 'req is defined')
      t.ok(line.res, 'res is defined')
      t.equal(line.msg, 'request completed', 'message is set')
      t.equal(line.req.method, 'GET', 'method is get')
      t.equal(line.res.statusCode, 200, 'statusCode is 200')
      t.end()
    })
  })
})
