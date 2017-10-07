'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('405', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/', function (req, reply) {
    reply.send({ hello: 'world' })
  })

  const injectOptions = {
    method: 'TRACE',
    url: '/',
    payload: '{}'
  }
  fastify.inject(injectOptions)
    .then(response => {
      t.strictEqual(response.statusCode, 405)
    })
})
