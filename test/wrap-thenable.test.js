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
    if (line.err && line.err.code === 'FST_ERR_REP_ALREADY_SENT') {
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
    if (line.msg === 'Handler errored, but a response is already being sent') {
      t.assert.strictEqual(line.err.message, 'second')
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'first')
})

test('async handler calling reply.send() without return should not lose the body with an async preSerialization hook', async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.addHook('preSerialization', async (request, reply, payload) => {
    await new Promise(resolve => setTimeout(resolve, 10))
    return payload
  })

  fastify.get('/', async (request, reply) => {
    reply.send({ hello: 'world' })
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, JSON.stringify({ hello: 'world' }))
})

test('async handler should respond with 500 when a custom serializer throws', { timeout: 1000 }, async t => {
  t.plan(2)
  const fastify = Fastify()
  t.after(() => fastify.close())

  fastify.get('/', async (request, reply) => {
    reply.header('content-type', 'application/json')
    reply.serializer(() => { throw new Error('ser boom') })
    reply.send('string')
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'ser boom')
})

test('async handler calling reply.send(error) then throwing should only send the first error once with async onSend hook', { timeout: 1000 }, async t => {
  t.plan(3)
  const fastify = Fastify()
  t.after(() => fastify.close())

  let onSendCalls = 0
  fastify.addHook('onSend', async (request, reply, payload) => {
    onSendCalls++
    await new Promise(resolve => setTimeout(resolve, 10))
    return payload
  })

  fastify.get('/', async (request, reply) => {
    reply.send(new Error('first'))
    throw new Error('second')
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'first')
  t.assert.strictEqual(onSendCalls, 1)
})

test('async handler calling reply.send() without return should warn while an async onSend hook delays the send', { timeout: 1000 }, async t => {
  t.plan(4)
  const stream = split(JSON.parse)
  const fastify = Fastify({ logger: { stream, level: 'warn' } })
  t.after(() => fastify.close())

  let onSendCalls = 0
  fastify.addHook('onSend', async (request, reply, payload) => {
    onSendCalls++
    await new Promise(resolve => setTimeout(resolve, 10))
    return payload
  })

  fastify.get('/', async (request, reply) => {
    reply.send({ hello: 'world' })
  })

  stream.on('data', line => {
    if (line.err && line.err.code === 'FST_ERR_REP_ALREADY_SENT') {
      t.assert.strictEqual(line.level, 40)
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, JSON.stringify({ hello: 'world' }))
  t.assert.strictEqual(onSendCalls, 1)
})

test('async handler calling reply.send() and returning a payload should run async onSend hooks only once', { timeout: 1000 }, async t => {
  t.plan(4)
  const stream = split(JSON.parse)
  const fastify = Fastify({ logger: { stream, level: 'warn' } })
  t.after(() => fastify.close())

  let onSendCalls = 0
  fastify.addHook('onSend', async (request, reply, payload) => {
    onSendCalls++
    await new Promise(resolve => setTimeout(resolve, 10))
    return payload
  })

  fastify.get('/', async (request, reply) => {
    reply.send({ first: true })
    return { second: true }
  })

  stream.on('data', line => {
    if (line.err && line.err.code === 'FST_ERR_REP_ALREADY_SENT') {
      t.assert.strictEqual(line.level, 40)
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, JSON.stringify({ first: true }))
  t.assert.strictEqual(onSendCalls, 1)
})

test('sync handler calling reply.send(error) then throwing should not crash while an async onError hook is running', { timeout: 1000 }, async t => {
  t.plan(3)
  const { fastify, stream } = buildAppWithSlowOnErrorHook(t, function (request, reply) {
    reply.send(new Error('first'))
    throw new Error('second')
  })

  stream.on('data', line => {
    if (line.msg === 'Handler errored, but a response is already being sent') {
      t.assert.strictEqual(line.err.message, 'second')
    }
  })

  const res = await fastify.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(res.json().message, 'first')
})
