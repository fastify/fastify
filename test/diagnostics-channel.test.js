'use strict'

const t = require('tap')
const test = t.test
let dc
try {
  dc = require('diagnostics_channel')
} catch {
  // Not available in this version of Node.js
  t.skip('diagnostics_channel is not available')
  process.exit(0)
}

test('diagnostics_channel', t => {
  t.plan(2)

  let fastifyInHook

  const channel = dc.channel('fastify.initialized')
  channel.subscribe(function ({ fastify }) {
    t.pass('message passed to channel')
    fastifyInHook = fastify
  })
  const fastify = require('../fastify')()
  t.equal(fastifyInHook, fastify)
})
