'use strict'

const request = require('request')
const http = require('http')

module.exports.payloadMethod = function (method, t) {
  const test = t.test
  const fastify = require('..')()
  const server = http.createServer(fastify)
  const upMethod = method.toUpperCase()
  const loMethod = method.toLowerCase()

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

  test(`${upMethod} can be created`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/', schema, function (req, reply) {
        reply(null, 200, req.body)
      })
      t.pass()
    } catch (e) {
      t.fail()
    }
  })

  test(`${upMethod} without schema can be created`, t => {
    t.plan(1)
    try {
      fastify[loMethod]('/missing', function (req, reply) {
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

    test(`${upMethod} - correctly replies`, t => {
      t.plan(3)
      request({
        method: upMethod,
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

    test(`${upMethod} without schema - correctly replies`, t => {
      t.plan(3)
      request({
        method: upMethod,
        uri: 'http://localhost:' + server.address().port + '/missing',
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

    test(`${upMethod} returns 415 - incorrect media type if body is not json`, t => {
      t.plan(2)
      request({
        method: upMethod,
        uri: 'http://localhost:' + server.address().port,
        body: 'hello world',
        timeout: 200
      }, (err, response, body) => {
        t.error(err)
        if (upMethod === 'OPTIONS') {
          t.strictEqual(response.statusCode, 200)
        } else {
          t.strictEqual(response.statusCode, 415)
        }
      })
    })

    test(`${upMethod} returns 422 - Unprocessable Entity`, t => {
      t.plan(2)
      request({
        method: upMethod,
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
}
