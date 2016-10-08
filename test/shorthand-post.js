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

server.listen(0, function (err) {
  if (err) {
    t.error(err)
  }

  server.unref()

  test('shorthand - post', t => {
    t.plan(3)
    request({
      method: 'POST',
      uri: 'http://localhost:' + server.address().port,
      body: {
        hello: 'world'
      },
      json: true
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, { hello: 'world' })
    })
  })

  test('returns 415 - incorrect media type if body is not json', t => {
    t.plan(2)
    request({
      method: 'POST',
      uri: 'http://localhost:' + server.address().port,
      body: 'hello world',
      timeout: 200
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 415)
    })
  })

  test('returns 422 - Unprocessable Entity', t => {
    t.plan(2)
    request({
      method: 'POST',
      uri: 'http://localhost:' + server.address().port,
      body: 'hello world',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 200
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 422)
    })
  })
})

