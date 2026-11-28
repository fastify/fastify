'use strict'

const { test } = require('node:test')
const serializeError = require('../../lib/error-serializer')

test('serializes the four error response properties in order', t => {
  t.plan(1)
  t.assert.strictEqual(
    serializeError({
      message: 'boom',
      extra: 'not sent',
      error: 'Internal Server Error',
      code: 'FST_ERR_TEST',
      statusCode: 500
    }),
    '{"statusCode":500,"code":"FST_ERR_TEST","error":"Internal Server Error","message":"boom"}'
  )
})

test('reads the message of an Error instance and omits the undefined properties', t => {
  t.plan(1)
  const error = new Error('boom')
  error.statusCode = 500
  t.assert.strictEqual(serializeError(error), '{"statusCode":500,"message":"boom"}')
})
