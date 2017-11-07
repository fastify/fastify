'use strict'

const sget = require('simple-get').concat
const sleep = require('then-sleep')
const Fastify = require('..')

function asyncHookTest (t) {
  const test = t.test
  test('async hooks', t => {
    t.plan(19)

    const fastify = Fastify()
    fastify.addHook('onRequest', async function (req, res) {
      await sleep(1)
      req.raw = 'the request is coming'
      res.raw = 'the reply has come'
      if (req.method === 'DELETE') {
        throw new Error('some error')
      }
    })

    fastify.addHook('preHandler', async function (request, reply) {
      await sleep(1)
      request.test = 'the request is coming'
      reply.test = 'the reply has come'
      if (request.req.method === 'HEAD') {
        throw new Error('some error')
      }
    })

    fastify.addHook('onSend', async function (request, reply, payload, next) {
      await sleep(1)
      t.ok('onSend called')
      next()
    })

    fastify.addHook('onResponse', async function (res) {
      await sleep(1)
      t.ok('onResponse called')
    })

    fastify.get('/', function (request, reply) {
      t.is(request.req.raw, 'the request is coming')
      t.is(reply.res.raw, 'the reply has come')
      t.is(request.test, 'the request is coming')
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

      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 200)
        t.strictEqual(response.headers['content-length'], '' + body.length)
        t.deepEqual(JSON.parse(body), { hello: 'world' })
      })

      sget({
        method: 'HEAD',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 500)
      })

      sget({
        method: 'DELETE',
        url: 'http://localhost:' + fastify.server.address().port
      }, (err, response, body) => {
        t.error(err)
        t.strictEqual(response.statusCode, 500)
      })
    })
  })
}

module.exports = asyncHookTest
