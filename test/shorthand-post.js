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

beo.post('/', schema, function (req, reply) {
  reply(null, 200, req.body)
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
