'use strict'

const { test } = require('tap')
const Fastify = require('..')

process.removeAllListeners('warning')

test('Should emit a warning when accessing request.req instead of request.raw', t => {
  t.plan(4)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP001')
    t.strictEqual(warning.message, 'You are accessing the Node.js core request object via "request.req", Use "request.raw" instead.')
  }

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(request.req.method + request.req.method)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
    process.removeListener('warning', onWarning)
  })
})

test('Should emit a warning when accessing reply.res instead of reply.raw', t => {
  t.plan(4)

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP002')
    t.strictEqual(warning.message, 'You are accessing the Node.js core response object via "reply.res", Use "reply.raw" instead.')
  }

  const fastify = Fastify()

  fastify.get('/', (request, reply) => {
    reply.send(reply.res.statusCode + reply.res.statusCode)
  })

  fastify.inject({
    method: 'GET',
    path: '/'
  }, (err, res) => {
    t.error(err)
    process.removeListener('warning', onWarning)
  })
})
