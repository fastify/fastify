'use strict'

const { test } = require('tap')
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

test('404 on unsupported method', t => {
  t.plan(3)
  server.listen(3000, err => {
    t.error(err)
    request({
      method: 'PUT',
      uri: 'http://localhost:' + server.address().port,
      json: {}
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
      server.close()
    })
  })
})
