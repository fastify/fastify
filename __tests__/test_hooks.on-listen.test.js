'use strict'

const { test } = require('node:test')
const Fastify = require('../fastify')

test('onListen should be called when listen is called', async (t) => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  let called = false
  fastify.addHook('onListen', async () => {
    called = true
  })

  await fastify.listen({ port: 0 })
  t.assert.strictEqual(called, true)
})

test('onListen should not be processed when .ready() is called', async (t) => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addHook('onListen', async () => {
    t.assert.fail('onListen should not be called')
  })

  await fastify.ready()
  t.assert.ok(true)
})

test('onListen hooks should be called in order', async (t) => {
  t.plan(1)
  const fastify = Fastify()
  t.after(() => fastify.close())
  const order = []

  fastify.addHook('onListen', async () => {
    order.push(1)
  })

  fastify.addHook('onListen', async () => {
    order.push(2)
  })

  await fastify.listen({ port: 0 })
  t.assert.deepStrictEqual(order, [1, 2])
})