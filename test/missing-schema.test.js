'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const http = require('http')
const fastify = require('..')()
const server = http.createServer(fastify)

test('missing schema', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/',
      handler: function (req, reply) {
        reply(null, 200, { hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

server.listen(0, function (err) {
  if (err) t.error(err)
  server.unref()

  test('missing schema - request', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
