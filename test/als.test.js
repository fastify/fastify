'use strict'

const { AsyncLocalStorage } = require('async_hooks')
const t = require('tap')
const Fastify = require('..')
const sget = require('simple-get').concat

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
  t.ok(storage.getStore())
  const id = storage.getStore().id
  reply.send({ id })
})

app.post('/', function (request, reply) {
  t.ok(storage.getStore())
  const id = storage.getStore().id
  reply.send({ id })
})

app.listen(3000, function (err, address) {
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
    t.same(body, { id: 0 })

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
      t.same(body, { id: 1 })

      sget({
        method: 'GET',
        url: 'http://localhost:' + app.server.address().port,
        json: true
      }, (err, response, body) => {
        t.error(err)
        t.equal(response.statusCode, 200)
        t.same(body, { id: 2 })
        app.close()
        t.end()
      })
    })
  })
})
