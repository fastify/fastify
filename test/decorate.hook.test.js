'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('onDecorate hooks are invoked for instance, request and reply', async (t) => {
  // 4 assertions: length + three deepStrictEqual checks
  t.plan(4)

  const fastify = Fastify()

  // capture calls
  const calls = []

  fastify.addHook('onDecorate', (instance, name, fn, done) => {
    calls.push(['instance', instance === fastify, name, typeof fn])
    done()
  })

  fastify.addHook('onDecorateRequest', (instance, name, fn, done) => {
    calls.push(['request', instance === fastify, name, typeof fn])
    done()
  })

  fastify.addHook('onDecorateReply', (instance, name, fn, done) => {
    calls.push(['reply', instance === fastify, name, typeof fn])
    done()
  })

  // decorate instance
  fastify.decorate('foo', () => { })
  // decorate request
  fastify.decorateRequest('bar', function () { })
  // decorate reply
  fastify.decorateReply('baz', function () { })

  // Wait for hooks to be processed
  await fastify.ready()

  // three hooks should have been called
  t.assert.strictEqual(calls.length, 3)

  t.assert.deepStrictEqual(calls[0], ['instance', true, 'foo', 'function'])
  t.assert.deepStrictEqual(calls[1], ['request', true, 'bar', 'function'])
  t.assert.deepStrictEqual(calls[2], ['reply', true, 'baz', 'function'])

  await fastify.close()
})
