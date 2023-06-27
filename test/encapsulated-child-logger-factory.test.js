'use strict'

const { test } = require('tap')
const Fastify = require('..')
const fp = require('fastify-plugin')

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

test('child logger factory set on root scope when using fastify-plugin', async t => {
  t.plan(4)

  const fastify = Fastify()
  fastify.register(fp(async function (fastify) {
    // Using fastify-plugin, the factory should be set on the root scope
    fastify.setChildLoggerFactory(function pluginFactory (logger, bindings, opts) {
      const child = logger.child(bindings, opts)
      child.customLog = function (message) {
        t.equal(message, 'custom')
      }
      return child
    })
    fastify.get('/not-encapsulated-1', async (req) => {
      req.log.customLog('custom')
    })
  }))

  fastify.get('/not-encapsulated-2', async (req) => {
    req.log.customLog('custom')
  })

  const res1 = await fastify.inject('/not-encapsulated-1')
  t.equal(res1.statusCode, 200)

  const res2 = await fastify.inject('/not-encapsulated-2')
  t.equal(res2.statusCode, 200)
})
