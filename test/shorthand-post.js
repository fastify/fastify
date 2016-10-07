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

test('shorthand post', t => {
  t.plan(1)
  try {
    fastify.post('/', schema, function (req, reply) {
      reply(null, 200, req.body)
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - post', t => {
  t.plan(4)
  server.listen(3000, err => {
    t.error(err)
    request({
      method: 'POST',
      uri: 'http://localhost:' + server.address().port,
      json: {
        hello: 'world'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, { hello: 'world' })
      server.close()
    })
  })
})
