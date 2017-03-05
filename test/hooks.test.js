'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const fastify = require('..')()

test('hooks - add onRequest', t => {
  t.plan(1)
  try {
    fastify.addHook({
      preHandler: function (req, res, next) {
        req.test = 'the request is coming'
        res.test = 'the reply has come'
        if (req.req.method === 'HEAD') {
          next(new Error('some error'))
        } else {
          next()
        }
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('hooks - add onRequestRaw', t => {
  t.plan(1)
  try {
    fastify.addHook({
      onRequest: function (req, res, next) {
        req.raw = 'the request is coming'
        res.raw = 'the reply has come'
        if (req.method === 'DELETE') {
          next(new Error('some error'))
        } else {
          next()
        }
      }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})

fastify.get('/', function (req, reply) {
  t.is(req.req.raw, 'the request is coming')
  t.is(reply.res.raw, 'the reply has come')
  t.is(req.test, 'the request is coming')
  t.is(reply.test, 'the reply has come')
  reply.code(200).send({ hello: 'world' })
})

fastify.head('/', function (req, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.delete('/', function (req, reply) {
  reply.code(200).send({ hello: 'world' })
})

fastify.listen(0, err => {
  t.error(err)
  fastify.server.unref()

  test('hooks - success', t => {
    t.plan(4)
    request({
      method: 'GET',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })

  test('hooks - throw onRequest', t => {
    t.plan(2)
    request({
      method: 'HEAD',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })

  test('hooks - throw onRequestRaw', t => {
    t.plan(2)
    request({
      method: 'DELETE',
      uri: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
    })
  })
})
