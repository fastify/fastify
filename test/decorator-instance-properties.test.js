'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('hasRequestDecorator returns true for built-in constructor-assigned request properties', t => {
  t.plan(6)
  const fastify = Fastify()
  t.assert.equal(fastify.hasRequestDecorator('id'), true)
  t.assert.equal(fastify.hasRequestDecorator('params'), true)
  t.assert.equal(fastify.hasRequestDecorator('raw'), true)
  t.assert.equal(fastify.hasRequestDecorator('query'), true)
  t.assert.equal(fastify.hasRequestDecorator('log'), true)
  t.assert.equal(fastify.hasRequestDecorator('body'), true)
})

test('hasReplyDecorator returns true for built-in constructor-assigned reply properties', t => {
  t.plan(3)
  const fastify = Fastify()
  t.assert.equal(fastify.hasReplyDecorator('raw'), true)
  t.assert.equal(fastify.hasReplyDecorator('request'), true)
  t.assert.equal(fastify.hasReplyDecorator('log'), true)
})

test('decorateRequest throws FST_ERR_DEC_ALREADY_PRESENT for built-in request properties', t => {
  t.plan(4)
  const fastify = Fastify()
  for (const name of ['id', 'params', 'raw', 'body']) {
    t.assert.throws(
      () => fastify.decorateRequest(name, null),
      (err) => err.code === 'FST_ERR_DEC_ALREADY_PRESENT'
    )
  }
})

test('decorateReply throws FST_ERR_DEC_ALREADY_PRESENT for built-in reply properties', t => {
  t.plan(2)
  const fastify = Fastify()
  for (const name of ['raw', 'request']) {
    t.assert.throws(
      () => fastify.decorateReply(name, null),
      (err) => err.code === 'FST_ERR_DEC_ALREADY_PRESENT'
    )
  }
})

test('hasRequestDecorator returns false for unknown properties', t => {
  t.plan(1)
  const fastify = Fastify()
  t.assert.equal(fastify.hasRequestDecorator('nonExistent'), false)
})

test('decorateRequest still works for non-built-in names', (t, done) => {
  t.plan(2)
  const fastify = Fastify()
  fastify.decorateRequest('myExtra', null)
  t.assert.equal(fastify.hasRequestDecorator('myExtra'), true)
  fastify.get('/', async (req) => req.myExtra)
  fastify.ready((err) => {
    t.assert.ifError(err)
    done()
  })
})
