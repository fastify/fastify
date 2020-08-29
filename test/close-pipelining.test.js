'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const { Client } = require('undici')

test('Should return 503 while closing - pipelining', t => {
  const fastify = Fastify({
    return503OnClosing: true
  })

  fastify.get('/', (req, reply) => {
    fastify.close()
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, async err => {
    t.error(err)

    const instance = new Client('http://localhost:' + fastify.server.address().port, {
      pipelining: 1
    })

    const codes = [200, 503]
    for (const code of codes) {
      instance.request(
        { path: '/', method: 'GET' }
      ).then(data => {
        t.strictEqual(data.statusCode, code)
      }).catch((e) => {
        t.fail(e)
      })
    }
    instance.close(() => {
      t.end('Done')
    })
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

    const instance = new Client('http://localhost:' + fastify.server.address().port, {
      pipelining: 1
    })

    const codes = [200, 200]
    for (const code of codes) {
      instance.request(
        { path: '/', method: 'GET' }
      ).then(data => {
        t.strictEqual(data.statusCode, code)
      }).catch((e) => {
        t.fail(e)
      })
    }
    instance.close(() => {
      t.end('Done')
    })
  })
})
