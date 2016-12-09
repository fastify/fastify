'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('../..')()

const internals = require('../../lib/tier-node')._internals

test('Reply should be an object', t => {
  t.plan(1)
  t.is(typeof internals.Reply, 'function')
})

test('Once called, Reply should return an object with methods', t => {
  t.plan(6)
  const response = { res: 'res' }
  function handle () {}
  const reply = new internals.Reply(response, handle)
  t.is(typeof reply, 'object')
  t.is(typeof reply.send, 'function')
  t.is(typeof reply.code, 'function')
  t.is(typeof reply.header, 'function')
  t.strictEqual(reply.res, response)
  t.strictEqual(reply.handle, handle)
})

test('Reply can set code and header of a response', t => {
  t.plan(1)
  try {
    fastify.get('/', function (req, reply) {
      reply.code(200)
      reply.header('Content-Type', 'text/plain')
      reply.send('hello world!')
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('Reply can set code and header of a response', t => {
  t.plan(1)
  try {
    fastify.get('/auto-status-code', function (req, reply) {
      reply.send('hello world!')
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('status code and content-type should be correct', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-type'], 'text/plain')
      t.deepEqual(JSON.parse(body), 'hello world!')
    })
  })

  test('auto status code shoud be 200', t => {
    t.plan(3)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port + '/auto-status-code'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), 'hello world!')
    })
  })
})
