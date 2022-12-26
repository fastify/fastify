'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const warning = require('../lib/warnings')

// Silence the standard warning logs. We will test the messages explicitly.
process.removeAllListeners('warning')

test('setDefaultRoute should emit a deprecation warning', t => {
  t.plan(2)

  const fastify = Fastify()
  const defaultRoute = (req, res) => {
    res.end('hello from defaultRoute')
  }

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, 'FSTDEP014')
  }

  t.teardown(() => {
    process.removeListener('warning', onWarning)
    warning.emitted.set('FSTDEP014', false)
  })

  fastify.setDefaultRoute(defaultRoute)
})

test('getDefaultRoute should emit a deprecation warning', t => {
  t.plan(2)

  const fastify = Fastify()

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.equal(warning.name, 'FastifyDeprecation')
    t.equal(warning.code, 'FSTDEP014')
  }

  t.teardown(() => {
    process.removeListener('warning', onWarning)
    warning.emitted.set('FSTDEP014', false)
  })

  fastify.getDefaultRoute()
})

test('should fail if defaultRoute is not a function', t => {
  t.plan(1)

  const fastify = Fastify()
  const defaultRoute = {}

  fastify.get('/', () => {})

  try {
    fastify.setDefaultRoute(defaultRoute)
  } catch (error) {
    t.equal(error.code, 'FST_ERR_DEFAULT_ROUTE_INVALID_TYPE')
  }
})

test('correctly sets, returns, and calls defaultRoute', t => {
  t.plan(3)

  const fastify = Fastify()
  const defaultRoute = (req, res) => {
    res.end('hello from defaultRoute')
  }

  fastify.setDefaultRoute(defaultRoute)
  const returnedDefaultRoute = fastify.getDefaultRoute()
  t.equal(returnedDefaultRoute, defaultRoute)

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/random'
  }, (err, res) => {
    t.error(err)
    t.equal(res.body, 'hello from defaultRoute')
  })
})
