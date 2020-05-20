'use strict'

const { Readable } = require('stream')
const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const fs = require('fs')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

process.removeAllListeners('warning')

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

test('preParsing hooks should be able to modify the payload', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', async (req, reply, payload) => {
    const stream = new Readable()

    stream.receivedEncodedLength = parseInt(req.headers['content-length'], 10)
    stream.push(JSON.stringify({ hello: 'another world' }))
    stream.push(null)

    return stream
  })

  fastify.post('/', function (request, reply) {
    reply.send(request.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'another world' })
  })
})

test('preParsing hooks can completely ignore the payload - deprecated syntax', t => {
  t.plan(5)
  const fastify = Fastify()

  process.on('warning', onWarning)
  function onWarning (warning) {
    t.strictEqual(warning.name, 'FastifyDeprecation')
    t.strictEqual(warning.code, 'FSTDEP004')
  }

  fastify.addHook('preParsing', async (req, reply) => {

  })

  fastify.post('/', function (request, reply) {
    reply.send(request.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 200)
    t.deepEqual(JSON.parse(res.payload), { hello: 'world' })

    process.removeListener('warning', onWarning)
  })
})

test('preParsing hooks should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preParsing', async (req, reply, payload) => {
    const e = new Error('kaboom')
    e.statusCode = 501
    throw e
  })

  fastify.post('/', function (request, reply) {
    reply.send(request.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { hello: 'world' }
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 501)
    t.deepEqual(JSON.parse(res.payload), { error: 'Not Implemented', message: 'kaboom', statusCode: 501 })
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

test('preValidation hooks should handle throwing null', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.setErrorHandler(async (error, request, reply) => {
    t.ok(error instanceof Error)
    reply.send(error)
  })

  fastify.addHook('preValidation', async () => {
    // eslint-disable-next-line no-throw-literal
    throw null
  })

  fastify.get('/', function (request, reply) { t.fail('the handler must not be called') })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 500)
    t.deepEqual(res.json(), {
      error: 'Internal Server Error',
      code: 'FST_ERR_SEND_UNDEFINED_ERR',
      message: 'Undefined error has occured',
      statusCode: 500
    })
  })
})

test('preValidation hooks should handle throwing a string', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.addHook('preValidation', async () => {
    // eslint-disable-next-line no-throw-literal
    throw 'this is an error'
  })

  fastify.get('/', function (request, reply) { t.fail('the handler must not be called') })

  fastify.inject({
    url: '/',
    method: 'GET'
  }, (err, res) => {
    t.error(err)
    t.is(res.statusCode, 500)
    t.equal(res.payload, 'this is an error')
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

test('onRequest respond with a stream', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.addHook('onRequest', async (req, reply) => {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(process.cwd() + '/test/stream.test.js', 'utf8')
      // stream.pipe(res)
      // res.once('finish', resolve)
      reply.send(stream)
      reply.raw.once('finish', () => resolve())
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
      reply.raw.once('finish', () => {
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

test('Should log a warning if is an async function with `done`', t => {
  t.test('3 arguments', t => {
    t.plan(1)
    const fastify = Fastify()

    try {
      fastify.addHook('onRequest', async (req, reply, done) => {})
    } catch (e) {
      t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
    }
  })

  t.test('4 arguments', t => {
    t.plan(3)
    const fastify = Fastify()

    try {
      fastify.addHook('onSend', async (req, reply, payload, done) => {})
    } catch (e) {
      t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
    }
    try {
      fastify.addHook('preSerialization', async (req, reply, payload, done) => {})
    } catch (e) {
      t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
    }
    try {
      fastify.addHook('onError', async (req, reply, payload, done) => {})
    } catch (e) {
      t.true(e.message === 'Async function has too many arguments. Async hooks should not use the \'done\' argument.')
    }
  })

  t.end()
})

test('early termination, onRequest async', async t => {
  t.plan(2)

  const app = Fastify()

  app.addHook('onRequest', async (req, reply) => {
    setImmediate(() => reply.send('hello world'))
    return reply
  })

  app.get('/', (req, reply) => {
    t.fail('should not happen')
  })

  const res = await app.inject('/')
  t.is(res.statusCode, 200)
  t.is(res.body.toString(), 'hello world')
})

test('The this should be the same of the encapsulation level', async t => {
  const fastify = Fastify()

  fastify.addHook('onRequest', async function (req, reply) {
    if (req.raw.url === '/nested') {
      t.strictEqual(this.foo, 'bar')
    } else {
      t.strictEqual(this.foo, undefined)
    }
  })

  fastify.register(plugin)
  fastify.get('/', (req, reply) => reply.send('ok'))

  async function plugin (fastify, opts) {
    fastify.decorate('foo', 'bar')
    fastify.get('/nested', (req, reply) => reply.send('ok'))
  }

  await fastify.inject({ method: 'GET', path: '/' })
  await fastify.inject({ method: 'GET', path: '/nested' })
  await fastify.inject({ method: 'GET', path: '/' })
  await fastify.inject({ method: 'GET', path: '/nested' })
})
