'use strict'

const t = require('tap')
const Fastify = require('../fastify')
const immediate = require('util').promisify(setImmediate)

t.test('onListen should be called in order', t => {
  t.plan(4)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onListen', function () {
    t.equal(order++, 0, 'called in root')
  })

  fastify.addHook('onListen', function () {
    t.equal(order++, 1, 'called in root')
  })

  fastify.listen({ host: '::', port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })
  })
})

t.test('async onListen should be called in order', async t => {
  t.plan(3)
  const fastify = Fastify()

  let order = 0

  fastify.addHook('onListen', async function () {
    await immediate()
    t.equal(order++, 0, 'called in root')
  })

  fastify.addHook('onListen', async function () {
    await immediate()
    t.equal(order++, 1, 'called in root')
  })

  await fastify.listen({ host: '::', port: 0 })
  t.pass('onListen')
})
