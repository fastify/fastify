'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')

test('onRegister should support object-based hook signature', async (t) => {
  const fastify = Fastify()
  let hookCalled = false

  const myHook = function ({ instance, options }) {
    hookCalled = true
    t.assert.ok(instance, 'instance should be passed in object')
    t.assert.ok(options, 'options should be passed in object')
  }

  // Mark the hook as using the new signature
  myHook.useObjectSignature = true
  fastify.addHook('onRegister', myHook)

  fastify.register(async (instance, opts) => {
    // Dummy plugin
  })

  await fastify.ready()
  t.assert.ok(hookCalled, 'The hook was called')
})
