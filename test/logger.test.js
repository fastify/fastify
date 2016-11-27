'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')
var fastify = null

try {
  fastify = Fastify({ logger: true })
  t.pass()
} catch (e) {
  t.fail()
}

fastify.get('/', function (req, reply) {
  try {
    req.req.log.info('test')
    t.pass()
  } catch (e) {
    t.fail()
  }
  reply(null, 200, { hello: 'world' })
})

fastify.listen(3000, err => {
  t.error(err)

  fastify.server.unref()

  test('should log the request', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port,
      json: {}
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, { hello: 'world' })
    })
  })
})
