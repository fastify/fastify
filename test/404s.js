'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const http = require('http')
const fastify = require('..')()
const server = http.createServer(fastify)

const schema = {
  out: {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }
}

fastify.get('/', schema, function (req, reply) {
  reply(null, 200, { hello: 'world' })
})

server.listen(3000, err => {
  t.error(err)

  server.unref()

  test('404 on unsupported method', t => {
    t.plan(2)
    request({
      method: 'PUT',
      uri: 'http://localhost:' + server.address().port,
      json: {}
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })

  test('404 on unsupported route', t => {
    t.plan(2)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/notSupported',
      json: {}
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})
