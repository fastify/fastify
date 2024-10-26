'use strict'

const { test } = require('node:test')
const Fastify = require('../..')
const statusCodes = require('node:http').STATUS_CODES
const diagnostics = require('node:diagnostics_channel')

test('Error.status property support', (t, done) => {
  t.plan(4)
  const fastify = Fastify()
  t.after(() => fastify.close())
  const err = new Error('winter is coming')
  err.status = 418

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.assert.strictEqual(msg.error.message, 'winter is coming')
  })

  fastify.get('/', () => {
    return Promise.reject(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 418)
    t.assert.deepStrictEqual(
      {
        error: statusCodes['418'],
        message: err.message,
        statusCode: 418
      },
      JSON.parse(res.payload)
    )
    done()
  })
})
