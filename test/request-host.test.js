'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const sget = require('simple-get').concat

test('should handle invalid hostname', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', function (req, reply) {
    t.equal(req.hostname, '')
    t.equal(req.port, null)
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'POST',
      url: 'http://localhost:' + fastify.server.address().port,
      headers: { Host: ' ' },
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
    })
  })
})
