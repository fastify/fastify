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

test('missing schema - get', t => {
  t.plan(1)
  try {
    fastify.get('/missing', function (req, reply) {
      reply(null, 200, { hello: 'world' })
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

server.listen(0, err => {
  t.error(err)
  server.unref()

  test('shorthand - request get', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('shorthand - request get missing schema', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/missing'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})
