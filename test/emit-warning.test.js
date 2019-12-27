'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Should emit a warning when accessing request.req instead of request.raw', t => {
  t.plan(2)

  process.once('warning', warning => {
    t.strictEqual(warning.message, 'You are accessing the Node.js core request object via "request.req", Use "request.raw" instead.')
  })

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(request.req.headers)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
  })
})

test('Should emit a warning when accessing reply.res instead of reply.raw', t => {
  t.plan(2)

  process.once('warning', warning => {
    t.strictEqual(warning.message, 'You are accessing the Node.js core response object via "reply.res", Use "reply.raw" instead.')
  })

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(reply.res.statusCode)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
  })
})
