'use strict'

const t = require('tap')
const Fastify = require('..')
const { ReadableStream } = require('stream/web')

t.test('reply.send(web ReadableStream) throws if locked', async t => {
  const app = Fastify()

  app.get('/', async (req, reply) => {
    const rs = new ReadableStream({
      start (controller) { controller.enqueue(new TextEncoder().encode('hi')); controller.close() }
    })
    // lock the stream
    const reader = rs.getReader()
    t.ok(rs.locked, 'stream is locked')

    // sending a locked stream should trigger the Fastify error
    reply.send(rs)
    await reader.releaseLock()
  })

  const res = await app.inject({ method: 'GET', url: '/' })
  t.equal(res.statusCode, 500)
  t.match(res.body, /locked/i) // message mentions "locked"
  await app.close()
})
