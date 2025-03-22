'use strict'

const { test } = require('node:test')
const http = require('node:http')
const Fastify = require('../fastify')

function runBadClientCall (reqOptions, payload) {
  let innerResolve, innerReject
  const promise = new Promise((resolve, reject) => {
    innerResolve = resolve
    innerReject = reject
  })

  const postData = JSON.stringify(payload)

  const req = http.request({
    ...reqOptions,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    }
  }, () => {
    innerReject(new Error('Request should have failed'))
  })

  // Kill the socket immediately (before sending data)
  req.on('socket', (socket) => {
    setTimeout(() => { socket.destroy() }, 5)
  })
  req.on('error', innerResolve)
  req.write(postData)
  req.end()

  return promise
}

test('should handle a soket error', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  function shouldNotHappen () {
    t.assert.fail('This should not happen')
  }
  process.on('unhandledRejection', shouldNotHappen)

  t.after(() => {
    fastify.close()
    process.removeListener('unhandledRejection', shouldNotHappen)
  })

  fastify.addHook('onRequest', async (request, reply) => {
    t.assert.ok('onRequest hook called')
  })

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.onSendCalled) {
      t.assert.fail('onSend hook called more than once')
      return
    }

    t.assert.ok('onSend hook called')
    request.onSendCalled = true

    // Introduce a delay
    await new Promise(resolve => setTimeout(resolve, 5))
    return payload
  })

  // The handler must be async to trigger the error
  fastify.put('/', async (request, reply) => {
    t.assert.ok('PUT handler called')
    return reply.send({ hello: 'world' })
  })

  await fastify.listen({ port: 0 })

  const err = await runBadClientCall({
    hostname: 'localhost',
    port: fastify.server.address().port,
    path: '/',
    method: 'PUT',
  }, { test: 'me' })
  t.assert.equal(err.code, 'ECONNRESET')
})
