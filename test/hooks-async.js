'use strict'

const split = require('split2')
const sget = require('simple-get').concat
const Fastify = require('..')
const fs = require('fs')
const { promisify } = require('util')
const sleep = promisify(setTimeout)

function asyncHookTest (t) {
  const test = t.test
  test('async hooks', t => {
    t.plan(21)

    const fastify = Fastify()
    fastify.addHook('onRequest', async function (request, reply) {
      await sleep(1)
      request.test = 'the request is coming'
      reply.test = 'the reply has come'
      if (request.raw.method === 'DELETE') {
        throw new Error('some error')
      }
    })

    fastify.addHook('preHandler', async function (request, reply) {
      await sleep(1)
      t.is(request.test, 'the request is coming')
      t.is(reply.test, 'the reply has come')
      if (request.raw.method === 'HEAD') {
        throw new Error('some error')
      }
    })

    fastify.addHook('onSend', async function (request, reply, payload) {
      await sleep(1)
      t.ok('onSend called')
    })

    fastify.addHook('onResponse', async function (request, reply) {
      await sleep(1)
      t.ok('onResponse called')
    })

    fastify.get('/', function (request, reply) {
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

  test('modify payload', t => {
    t.plan(10)
    const fastify = Fastify()
    const payload = { hello: 'world' }
    const modifiedPayload = { hello: 'modified' }
    const anotherPayload = '"winter is coming"'

    fastify.addHook('onSend', async function (request, reply, thePayload) {
      t.ok('onSend called')
      t.deepEqual(JSON.parse(thePayload), payload)
      return thePayload.replace('world', 'modified')
    })

    fastify.addHook('onSend', async function (request, reply, thePayload) {
      t.ok('onSend called')
      t.deepEqual(JSON.parse(thePayload), modifiedPayload)
      return anotherPayload
    })

    fastify.addHook('onSend', async function (request, reply, thePayload) {
      t.ok('onSend called')
      t.strictEqual(thePayload, anotherPayload)
    })

    fastify.get('/', (req, reply) => {
      reply.send(payload)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, (err, res) => {
      t.error(err)
      t.strictEqual(res.payload, anotherPayload)
      t.strictEqual(res.statusCode, 200)
      t.strictEqual(res.headers['content-length'], '18')
    })
  })

  test('onRequest hooks should be able to block a request', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('onRequest', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('onRequest', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('preHandler', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.ok('called')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preHandler hooks should be able to block a request', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('preHandler', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('preHandler', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.equal(payload, 'hello')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preValidation hooks should be able to block a request', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('preValidation', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('preValidation', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.equal(payload, 'hello')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preValidation hooks should be able to block a request with async onSend', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('preValidation', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      await sleep(10)
      t.equal(payload, 'hello')
    })

    fastify.addHook('preHandler', async (request, reply) => {
      t.fail('we should not be here')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.post('/', {
      schema: {
        body: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          required: ['hello']
        }
      }
    }, function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'POST'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preSerialization hooks should be able to modify the payload', t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.addHook('preSerialization', async (req, reply, payload) => {
      return { hello: 'another world' }
    })

    fastify.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.deepEqual(JSON.parse(res.payload), { hello: 'another world' })
    })
  })

  test('preSerialization hooks should handle errors', t => {
    t.plan(3)
    const fastify = Fastify()

    fastify.addHook('preSerialization', async (req, reply, payload) => {
      throw new Error('kaboom')
    })

    fastify.get('/', function (request, reply) {
      reply.send({ hello: 'world' })
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 500)
      t.deepEqual(JSON.parse(res.payload), { error: 'Internal Server Error', message: 'kaboom', statusCode: 500 })
    })
  })

  test('onRequest hooks should be able to block a request (last hook)', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('onRequest', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('preHandler', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.ok('called')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preHandler hooks should be able to block a request (last hook)', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('preHandler', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.equal(payload, 'hello')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('preHandler hooks should be able to block a request (last hook) with a delay in onSend', t => {
    t.plan(5)
    const fastify = Fastify()

    fastify.addHook('preHandler', async (req, reply) => {
      reply.send('hello')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      await sleep(10)
      t.equal(payload, 'hello')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
      t.is(res.payload, 'hello')
    })
  })

  test('onRequest respond with a stream', t => {
    t.plan(4)
    const fastify = Fastify()

    fastify.addHook('onRequest', async (req, reply) => {
      return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
        // stream.pipe(res)
        // res.once('finish', resolve)
        reply.send(stream)
        reply.res.once('finish', () => resolve())
      })
    })

    fastify.addHook('onRequest', async (req, res) => {
      t.fail('this should not be called')
    })

    fastify.addHook('preHandler', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.ok('called')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
    })
  })

  test('preHandler respond with a stream', t => {
    t.plan(7)
    const fastify = Fastify()

    fastify.addHook('onRequest', async (req, res) => {
      t.ok('called')
    })

    // we are calling `reply.send` inside the `preHandler` hook with a stream,
    // this triggers the `onSend` hook event if `preHanlder` has not yet finished
    const order = [1, 2]

    fastify.addHook('preHandler', async (req, reply) => {
      return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
        reply.send(stream)
        reply.res.once('finish', () => {
          t.is(order.shift(), 2)
          resolve()
        })
      })
    })

    fastify.addHook('preHandler', async (req, reply) => {
      t.fail('this should not be called')
    })

    fastify.addHook('onSend', async (req, reply, payload) => {
      t.is(order.shift(), 1)
      t.is(typeof payload.pipe, 'function')
    })

    fastify.addHook('onResponse', async (request, reply) => {
      t.ok('called')
    })

    fastify.get('/', function (request, reply) {
      t.fail('we should not be here')
    })

    fastify.inject({
      url: '/',
      method: 'GET'
    }, (err, res) => {
      t.error(err)
      t.is(res.statusCode, 200)
    })
  })

  test('Should log a warning if is an async function with `next`', t => {
    t.test('3 arguments', t => {
      t.plan(3)
      const stream = split(JSON.parse)
      const fastify = Fastify({
        logger: { stream }
      })

      stream.on('data', line => {
        t.strictEqual(line.level, 40)
        t.true(line.msg.startsWith(`Async function has too many arguments. Async hooks should not use the 'next' argument.`))
        t.true(/test(\\|\/)hooks-async\.js/.test(line.msg))
      })

      fastify.addHook('onRequest', async (req, reply, next) => {})
    })

    t.test('4 arguments', t => {
      t.plan(6)
      const stream = split(JSON.parse)
      const fastify = Fastify({
        logger: { stream }
      })

      stream.on('data', line => {
        t.strictEqual(line.level, 40)
        t.true(line.msg.startsWith(`Async function has too many arguments. Async hooks should not use the 'next' argument.`))
        t.true(/test(\\|\/)hooks-async\.js/.test(line.msg))
      })

      fastify.addHook('onSend', async (req, reply, payload, next) => {})
      fastify.addHook('preSerialization', async (req, reply, payload, next) => {})
    })

    t.end()
  })
}

module.exports = asyncHookTest
