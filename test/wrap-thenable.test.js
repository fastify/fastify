'use strict'

const { test } = require('node:test')
const { kReplyHijacked } = require('../lib/symbols')
const wrapThenable = require('../lib/wrap-thenable')
const Reply = require('../lib/reply')
const Fastify = require('..')
const split = require('split2')

test('should resolve immediately when reply[kReplyHijacked] is true', async t => {
  await new Promise(resolve => {
    const reply = {}
    reply[kReplyHijacked] = true
    const thenable = Promise.resolve()
    wrapThenable(thenable, reply)
    resolve()
  })
})

test('should reject immediately when reply[kReplyHijacked] is true', t => {
  t.plan(1)
  const reply = new Reply({}, {}, {})
  reply[kReplyHijacked] = true
  reply.log = {
    error: ({ err }) => {
      t.assert.strictEqual(err.message, 'Reply sent already')
    }
  }

  const thenable = Promise.reject(new Error('Reply sent already'))
  wrapThenable(thenable, reply)
})

function buildAppWithSlowOnErrorHook (t, handler) {
  const stream = split(JSON.parse)
  const fastify = Fastify({ logger: { stream, level: 'warn' } })
  t.after(() => fastify.close())

  fastify.addHook('onError', async () => {
    await new Promise(resolve => setTimeout(resolve, 10))
  })
  fastify.get('/', handler)

  return { fastify, stream }
}

test('async handler calling reply.send(error) should not crash while an async onError hook is running', async t => {
  t.plan(2)
  const { fastify } = buildAppWithSlowOnErrorHook(t, async (request, reply) => {
    reply.send(new Error('kaboom'))
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'kaboom')
})

test('async handler returning a payload should not crash while an async onError hook is running', async t => {
  t.plan(3)
  const { fastify, stream } = buildAppWithSlowOnErrorHook(t, async (request, reply) => {
    reply.send(new Error('kaboom'))
    return { hello: 'world' }
  })

  stream.on('data', line => {
    if (line.msg === 'Promise resolved with a payload, but an error response is already being sent') {
      t.assert.strictEqual(line.level, 40) // warn
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'kaboom')
})

test('async handler rejecting should not crash while an async onError hook is running', async t => {
  t.plan(3)
  const { fastify, stream } = buildAppWithSlowOnErrorHook(t, async (request, reply) => {
    reply.send(new Error('first'))
    throw new Error('second')
  })

  stream.on('data', line => {
    if (line.msg === 'Promise errored, but an error response is already being sent') {
      t.assert.strictEqual(line.err.message, 'second')
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'first')
})
