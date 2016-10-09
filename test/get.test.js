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

test('shorthand - get', t => {
  t.plan(1)
  try {
    fastify.get('/', schema, function (req, reply) {
      reply(null, 200, { hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get', t => {
  t.plan(5)
  server.listen(0, err => {
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
      server.close()
    })
  })
})
