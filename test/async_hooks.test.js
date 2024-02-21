'use strict'

const { createHook } = require('node:async_hooks')
const t = require('tap')
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

app.get('/', function (request, reply) {
  reply.send({ id: 42 })
})

app.post('/', function (request, reply) {
  reply.send({ id: 42 })
})

app.listen({ port: 0 }, function (err, address) {
  t.error(err)

  sget({
    method: 'POST',
    url: 'http://localhost:' + app.server.address().port,
    body: {
      hello: 'world'
    },
    json: true
  }, (err, response, body) => {
    t.error(err)
    t.equal(response.statusCode, 200)

    sget({
      method: 'POST',
      url: 'http://localhost:' + app.server.address().port,
      body: {
        hello: 'world'
      },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)

      sget({
        method: 'GET',
        url: 'http://localhost:' + app.server.address().port,
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        app.close()
        t.equal(remainingIds.size, 0)
        t.end()
      })
    })
  })
})
