'use strict'

const t = require('tap')
const test = t.test
let dc
try {
  dc = require('diagnostics_channel')
} catch {
  // Not available in this version of Node.js
}

test('diagnostics_channel', t => {
  if (!dc) {
    t.plan(1)
    t.skip('diagnostics_channel is not available')
    return
  }
  t.plan(2)

  let fastifyInHook

  const channel = dc.channel('fastify:initialized')
  channel.subscribe(function ({ fastify }) {
    t.pass('message passed to channel')
    fastifyInHook = fastify
  })
  const fastify = require('../fastify')()
  t.equal(fastifyInHook, fastify)
})
