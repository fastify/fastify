'use strict'

const { test } = require('tap')
const request = require('request')
const http = require('http')
const fastify = require('..')()
const server = http.createServer(fastify)

test('route - get', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/',
      schema: {
        out: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          }
        }
      },
      handler: function (req, reply) {
        reply(null, 200, { hello: 'world' })
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('extended - get', t => {
  t.plan(4)
  server.listen(3000, function (err) {
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
