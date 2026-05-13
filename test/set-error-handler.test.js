'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { FST_ERR_ERROR_HANDLER_NOT_FN, FST_ERR_ERROR_HANDLER_ALREADY_SET } = require('../lib/errors')
const { FSTWRN004 } = require('../lib/warnings')

test('setErrorHandler should throw an error if the handler is not a function', t => {
  t.plan(1)
  const fastify = Fastify()

  t.assert.throws(() => fastify.setErrorHandler('not a function'), new FST_ERR_ERROR_HANDLER_NOT_FN())
})

test('setErrorHandler can be set independently in parent and child scopes', async t => {
  t.plan(1)

  const fastify = Fastify()

  t.assert.doesNotThrow(() => {
    fastify.setErrorHandler(() => {})
    fastify.register(async (child) => {
      child.setErrorHandler(() => {})
    })
  })
})

test('setErrorHandler can be overridden if allowErrorHandlerOverride is set to true', async t => {
  t.plan(2)

  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.register(async (child) => {
    child.setErrorHandler(() => {})
    t.assert.doesNotThrow(() => child.setErrorHandler(() => {}))
  })

  fastify.setErrorHandler(() => {})
  t.assert.doesNotThrow(() => fastify.setErrorHandler(() => {}))

  await fastify.ready()
})

test('if `allowErrorHandlerOverride` is disabled, setErrorHandler should throw if called more than once in the same scope', t => {
  t.plan(1)

  const fastify = Fastify({
    allowErrorHandlerOverride: false
  })

  fastify.setErrorHandler(() => {})
  t.assert.throws(() => fastify.setErrorHandler(() => {}), new FST_ERR_ERROR_HANDLER_ALREADY_SET())
})

test('if `allowErrorHandlerOverride` is disabled, setErrorHandler should throw if called more than once in the same scope 2', async t => {
  t.plan(1)

  const fastify = Fastify({
    allowErrorHandlerOverride: false
  })
  t.after(() => fastify.close())

  fastify.register(async (child) => {
    child.setErrorHandler(() => {})
    t.assert.throws(() => child.setErrorHandler(() => {}), new FST_ERR_ERROR_HANDLER_ALREADY_SET())
  })

  await fastify.ready()
})

test('setErrorHandler should emit FSTWRN004 when overriding an error handler in the same scope', async t => {
  t.plan(4)

  let resolveWarning
  const warningReceived = new Promise(resolve => { resolveWarning = resolve })

  function onWarning (warning) {
    if (warning.code === FSTWRN004.code) {
      resolveWarning(warning)
    }
  }

  process.on('warning', onWarning)

  const fastify = Fastify()

  t.after(() => {
    fastify.close()
    process.removeListener('warning', onWarning)
    FSTWRN004.emitted = false
  })

  fastify.setErrorHandler(() => {})
  fastify.setErrorHandler(() => {})

  const warning = await warningReceived
  t.assert.strictEqual(warning.name, 'FastifyWarning')
  t.assert.strictEqual(warning.code, FSTWRN004.code)
  t.assert.ok(warning.message.includes('allowErrorHandlerOverride'))
  t.assert.ok(warning.message.includes('https://fastify.dev/docs/latest/Reference/Server/#allowerrorhandleroverride'))
})
