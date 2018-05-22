'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const autocannon = require('autocannon')

test('Should return 503 while closing - pipelining', t => {
  t.plan(5)
  const fastify = Fastify({ requestTimeout: 10 })

  fastify.get('/', (req, reply) => {
    fastify.close()
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    const instance = autocannon({
      url: 'http://localhost:' + fastify.server.address().port,
      pipelining: 1,
      connections: 1,
      amount: 3
    })

    const codes = [200, 503, 'error']
    instance.on('response', (client, statusCode) => {
      t.strictEqual(codes.shift(), statusCode)
    })

    instance.on('done', () => t.pass())
    instance.on('reqError', () => t.strictEqual(codes.shift(), 'error'))
    instance.on('error', err => t.fail(err))
  })
})
