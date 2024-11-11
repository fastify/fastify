'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('sync route', async t => {
  const app = Fastify()
  app.get('/', () => 'hello world')
  const res = await app.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, 'hello world')
  app.close()
})

test('sync route return null', async t => {
  const app = Fastify()
  app.get('/', () => null)
  const res = await app.inject('/')
  t.assert.strictEqual(res.statusCode, 200)
  t.assert.strictEqual(res.body, 'null')
  app.close()
})

test('sync route, error', async t => {
  const app = Fastify()
  app.get('/', () => {
    throw new Error('kaboom')
  })
  const res = await app.inject('/')
  t.assert.strictEqual(res.statusCode, 500)
  app.close()
})
