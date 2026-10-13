'use strict'

const { AsyncLocalStorage, AsyncResource, createHook, executionAsyncId } = require('node:async_hooks')
const { setImmediate: immediate } = require('node:timers/promises')
const { test } = require('node:test')
const Fastify = require('..')

test('content type parser callbacks restore request context and destroy their resources', async t => {
  const storage = new AsyncLocalStorage()
  const external = new AsyncResource('external-parser')
  const resources = new Set()
  const destroyed = new Set()
  const hook = createHook({
    init (id, type) {
      if (type === 'content-type-parser:run') resources.add(id)
    },
    destroy (id) {
      if (resources.has(id)) destroyed.add(id)
    }
  }).enable()
  const app = Fastify()
  t.after(async () => {
    hook.disable()
    external.emitDestroy()
    storage.disable()
    await app.close()
  })

  app.addHook('onRequest', (request, reply, done) => {
    storage.run({ id: request.headers['x-request-id'] }, done)
  })

  app.addContentTypeParser('application/custom', { parseAs: 'string' }, (request, body, done) => {
    external.runInAsyncScope(() => {
      t.assert.strictEqual(storage.getStore(), undefined)
      setImmediate(() => {
        if (body === 'error') {
          done(new Error('parser failed'))
        } else {
          done(null, body)
        }
      })
    })
  })

  function assertContext (request) {
    t.assert.deepStrictEqual(storage.getStore(), { id: request.headers['x-request-id'] })
    t.assert.ok(resources.has(executionAsyncId()))
  }

  app.setErrorHandler((error, request, reply) => {
    assertContext(request)
    reply.code(400).send({ error: error.message, id: storage.getStore().id })
  })
  app.post('/', (request, reply) => {
    assertContext(request)
    return { body: request.body, id: storage.getStore().id }
  })

  const responses = await Promise.all(['first', 'second', 'error'].map(id => app.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'application/custom', 'x-request-id': id },
    payload: id
  })))

  t.assert.deepStrictEqual(responses.map(response => response.statusCode), [200, 200, 400])
  t.assert.deepStrictEqual(responses.map(response => response.json()), [
    { body: 'first', id: 'first' },
    { body: 'second', id: 'second' },
    { error: 'parser failed', id: 'error' }
  ])
  await immediate()
  t.assert.strictEqual(resources.size, 3)
  t.assert.deepStrictEqual(destroyed, resources)
})
