'use strict'

const { createHook } = require('node:async_hooks')
const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

const remainingIds = new Set()

createHook({
  init (asyncId, type, triggerAsyncId, resource) {
    if (type === 'content-type-parser:run') {
      remainingIds.add(asyncId)
    }
  },
  destroy (asyncId) {
    remainingIds.delete(asyncId)
  }
})

const app = Fastify({ logger: false })

test('test async hooks', (t, done) => {
  app.get('/', function (request, reply) {
    reply.send({ id: 42 })
  })

  app.post('/', function (request, reply) {
    reply.send({ id: 42 })
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

        sget({
          method: 'GET',
          url: 'http://localhost:' + app.server.address().port,
          json: true
        }, (err, response, body) => {
          t.assert.ifError(err)
          t.assert.strictEqual(response.statusCode, 200)
          app.close()
          t.assert.strictEqual(remainingIds.size, 0)
          done()
        })
      })
    })
  })
})
