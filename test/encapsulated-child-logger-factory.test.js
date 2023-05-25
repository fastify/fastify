'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('encapsulates an child logger factory', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(async function (fastify) {
    fastify.setChildLoggerFactory(function pluginFactory (logger, bindings, opts) {
      const child = logger.child(bindings, opts)
      child.customLog = function (message) {
        t.equal(message, 'custom')
      }
      return child
    })
    fastify.get('/encapsulated', async (req) => {
      req.log.customLog('custom')
    })
  })

  fastify.setChildLoggerFactory(function globalFactory (logger, bindings, opts) {
    const child = logger.child(bindings, opts)
    child.globalLog = function (message) {
      t.equal(message, 'global')
    }
    return child
  })
  fastify.get('/not-encapsulated', async (req) => {
    req.log.globalLog('global')
  })

  const res1 = await fastify.inject('/encapsulated')
  t.equal(res1.statusCode, 200)

  const res2 = await fastify.inject('/not-encapsulated')
  t.equal(res2.statusCode, 200)
})
