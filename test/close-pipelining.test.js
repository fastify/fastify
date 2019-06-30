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

    instance.on('done', () => {
      t.strictEqual(codes.length, 0)
      t.end('Done')
    })
    instance.on('reqError', () => {
      t.strictEqual(codes.shift(), undefined)
    })
    instance.on('error', err => t.fail(err))
  })
})

test('Should not return 503 while closing - pipelining - return503OnClosing', t => {
  const fastify = Fastify({
    return503OnClosing: false
  })

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

    const codes = [200, 200]
    instance.on('response', (client, statusCode) => {
      t.strictEqual(statusCode, codes.shift())
    })

    instance.on('done', () => {
      t.strictEqual(codes.length, 0)
      t.end('Done')
    })
    instance.on('reqError', () => {
      t.strictEqual(codes.shift(), undefined)
    })
    instance.on('error', err => t.fail(err))
  })
})
