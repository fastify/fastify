'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')

test('405', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  t.tearDown(fastify.close.bind(fastify))

  fastify.listen(0, err => {
    t.error(err)

    t.test('unsupported method', t => {
      t.plan(2)
      request({
        method: 'TRACE',
        uri: 'http://localhost:' + fastify.server.address().port,
        json: {}
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 405)
      })
    })
  })
})
