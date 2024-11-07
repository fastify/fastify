'use strict'

const { AsyncLocalStorage } = require('node:async_hooks')
const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('Async Local Storage test', (t, done) => {
  t.plan(13)
  if (!AsyncLocalStorage) {
    t.skip('AsyncLocalStorage not available, skipping test')
    process.exit(0)
  }

  const storage = new AsyncLocalStorage()
  const app = Fastify({ logger: false })

  let counter = 0
  app.addHook('onRequest', (req, reply, next) => {
    const id = counter++
    storage.run({ id }, next)
  })

  app.get('/', function (request, reply) {
    t.assert.ok(storage.getStore())
    const id = storage.getStore().id
    reply.send({ id })
  })

  app.post('/', function (request, reply) {
    t.assert.ok(storage.getStore())
    const id = storage.getStore().id
    reply.send({ id })
  })

  app.listen({ port: 0 }, function (err, address) {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: 'http://localhost:' + app.server.address().port,
      body: {
        hello: 'world'
      },
      json: true
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body, { id: 0 })

      sget({
        method: 'POST',
        url: 'http://localhost:' + app.server.address().port,
        body: {
          hello: 'world'
        },
        json: true
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(body, { id: 1 })

        sget({
          method: 'GET',
          url: 'http://localhost:' + app.server.address().port,
          json: true
        }, (err, response, body) => {
          t.assert.ifError(err)
          t.assert.strictEqual(response.statusCode, 200)
          t.assert.deepStrictEqual(body, { id: 2 })
          app.close()
          done()
        })
      })
    })
  })
})
