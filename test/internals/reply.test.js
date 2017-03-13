'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('../..')()

const Reply = require('../../lib/reply')

test('Reply should be an object', t => {
  t.plan(1)
  t.is(typeof Reply, 'function')
})

test('Once called, Reply should return an object with methods', t => {
  t.plan(7)
  const request = { req: 'req' }
  const response = { res: 'res' }
  function handle () {}
  const reply = new Reply(request, response, handle)
  t.is(typeof reply, 'object')
  t.is(typeof reply.send, 'function')
  t.is(typeof reply.code, 'function')
  t.is(typeof reply.header, 'function')
  t.strictEqual(reply._req, request)
  t.strictEqual(reply.res, response)
  t.strictEqual(reply.handle, handle)
})

test('reply.header, reply.code and reply-serializer should return an instance of Reply', t => {
  t.plan(3)
  const request = {}
  const response = { setHeader: () => {} }
  const reply = new Reply(request, response, null)
  t.type(reply.code(1), Reply)
  t.type(reply.serializer(() => {}), Reply)
  t.type(reply.header('hello', 'world'), Reply)
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

test('reply.serializer should set a custom serializer', t => {
  t.plan(2)
  const reply = new Reply(null, null, null)
  t.equal(reply._serializer, null)
  reply.serializer('serializer')
  t.equal(reply._serializer, 'serializer')
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

test('Reply.send should return undefined', t => {
  t.plan(2)
  try {
    fastify.get('/undefined', function (req, reply) {
      t.strictEqual(reply.send('hello world!'), undefined)
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
      t.deepEqual(body, 'hello world!')
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

  request({
    method: 'GET',
    uri: 'http://localhost:' + fastify.server.address().port + '/undefined'
  }, (err, response, body) => {
    t.error(err)
  })
})
