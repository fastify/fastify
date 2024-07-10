'use strict'

const t = require('tap')
const diagnostics = require('node:diagnostics_channel')
const test = t.test
require('../../lib/hooks').onSendHookRunner = function Stub () {}
const Request = require('../../lib/request')
const Reply = require('../../lib/reply')
const symbols = require('../../lib/symbols.js')
const { preHandlerCallback } = require('../../lib/handleRequest')[Symbol.for('internals')]

test('diagnostics channel handles an error before calling context handler', t => {
  t.plan(3)
  let callOrder = 0

  diagnostics.subscribe('tracing:fastify.request.handler:start', (msg) => {
    t.equal(callOrder++, 0)
  })

  diagnostics.subscribe('tracing:fastify.request.handler:error', (msg) => {
    t.equal(callOrder++, 1)
    t.equal(msg.error.message, 'oh no')
  })

  const error = new Error('oh no')
  const request = new Request()
  const reply = new Reply({}, request)
  request[symbols.kRouteContext] = {
    config: {
      url: '/foo',
      method: 'GET'
    }
  }

  preHandlerCallback(error, request, reply)
})
