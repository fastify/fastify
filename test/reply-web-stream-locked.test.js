'use strict'

const { ReadableStream } = require('node:stream/web')
const { test, after } = require('node:test')
const Fastify = require('..')

test('reply.send(web ReadableStream) throws if locked', async t => {
  t.plan(3)

  const app = Fastify()
  after(() => app.close())

  app.get('/', (req, reply) => {
    const rs = new ReadableStream({
      start (controller) { controller.enqueue(new TextEncoder().encode('hi')); controller.close() }
    })
    // lock the stream
    const reader = rs.getReader()
    t.assert.strictEqual(rs.locked, true, 'stream is locked')

    // sending a locked stream should trigger the Fastify error
    reply.send(rs)
    reader.releaseLock()
  })

  const res = await app.inject({ method: 'GET', url: '/' })
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.deepStrictEqual(
    JSON.parse(res.body),
    {
      statusCode: 500,
      code: 'FST_ERR_REP_READABLE_STREAM_LOCKED',
      error: 'Internal Server Error',
      message: 'ReadableStream was locked. You should call releaseLock() method on reader before sending.'
    }
  )
})

test('explicit HEAD reply.send(web ReadableStream) throws if locked', async t => {
  t.plan(4)

  const app = Fastify()
  after(() => app.close())

  let errorCode
  app.setErrorHandler((err, req, reply) => {
    errorCode = err.code
    reply.send(err)
  })

  app.route({
    method: 'HEAD',
    url: '/',
    handler: (req, reply) => {
      const rs = new ReadableStream({
        start (controller) { controller.enqueue(new TextEncoder().encode('hi')); controller.close() }
      })
      rs.getReader()
      t.assert.strictEqual(rs.locked, true, 'stream is locked')
      reply.send(rs)
    }
  })

  const res = await app.inject({ method: 'HEAD', url: '/' })
  t.assert.strictEqual(res.statusCode, 500)
  t.assert.strictEqual(errorCode, 'FST_ERR_REP_READABLE_STREAM_LOCKED')
  t.assert.strictEqual(res.body, '')
})
