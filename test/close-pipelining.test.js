'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const autocannon = require('autocannon')

test('Should return 503 while closing - pipelining', t => {
  const fastify = Fastify()

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
      amount: 10
    })

    const codes = [200, 503]
    instance.on('response', (client, statusCode) => {
      t.strictEqual(statusCode, codes.shift())
    })

    instance.on('done', () => t.end('Done'))
    instance.on('reqError', () => t.deepEqual(codes.shift(), null))
    instance.on('error', err => t.fail(err))
  })
})
