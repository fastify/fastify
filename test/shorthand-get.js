'use strict'

const { test } = require('tap')
const request = require('request')
const http = require('http')
const beo = require('..')()
const server = http.createServer(beo)

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
    beo.get('/', schema, function (req, reply) {
      reply(null, 200, { hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('shorthand - get', t => {
  t.plan(4)
  server.listen(3000, err => {
    t.error(err)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
      server.close()
    })
  })
})
