'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const { FST_ERR_ERROR_HANDLER_NOT_FN } = require('../lib/errors')

test('setErrorHandler should throw an error if the handler is not a function', t => {
  t.plan(1)
  const fastify = Fastify()

  t.assert.throws(() => fastify.setErrorHandler('not a function'), new FST_ERR_ERROR_HANDLER_NOT_FN())
})
