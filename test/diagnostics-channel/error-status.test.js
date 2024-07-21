'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../..')
const statusCodes = require('node:http').STATUS_CODES
const diagnostics = require('node:diagnostics_channel')

test('Error.status property support', t => {
  t.plan(4)
  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))
  const err = new Error('winter is coming')
  err.status = 418

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.equal(msg.error.message, 'winter is coming')
  })

  fastify.get('/', () => {
    return Promise.reject(err)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.equal(res.statusCode, 418)
    t.same(
      {
        error: statusCodes['418'],
        message: err.message,
        statusCode: 418
      },
      JSON.parse(res.payload)
    )
  })
})
