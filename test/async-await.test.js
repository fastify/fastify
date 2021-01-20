'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')
const split = require('split2')
const pino = require('pino')
const statusCodes = require('http').STATUS_CODES
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const opts = {
  schema: {
    response: {
      '2xx': {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
    }
  }
}

test('async await', t => {
  t.plan(11)
  const fastify = Fastify()
  try {
    fastify.get('/', opts, async function awaitMyFunc (req, reply) {
      await sleep(200)
      return { hello: 'world' }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

  try {
    fastify.get('/no-await', opts, async function (req, reply) {
      return { hello: 'world' }
    })
    t.pass()
  } catch (e) {
    t.fail()
  }

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
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no-await'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(response.headers['content-length'], '' + body.length)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (undefined)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world' }

  server.get('/', async function awaitMyFunc (req, reply) {
    reply.send(payload)
  })

  t.tearDown(server.close.bind(server))

  server.listen(0, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.deepEqual(payload, JSON.parse(body))
      t.strictEqual(res.statusCode, 200)
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (object)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world2' }

  server.get('/', async function awaitMyFunc (req, reply) {
    reply.send(payload)
    return { hello: 'world' }
  })

  t.tearDown(server.close.bind(server))

  server.listen(0, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.deepEqual(payload, JSON.parse(body))
      t.strictEqual(res.statusCode, 200)
    })
  })
})

test('server logs an error if reply.send is called and a value is returned via async/await', t => {
  const lines = ['incoming request', 'request completed', 'Reply already sent']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const logger = pino(splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', async (req, reply) => {
    reply.send({ hello: 'world' })
    return { hello: 'world2' }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (undefined)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world' }

  server.get('/', async function awaitMyFunc (req, reply) {
    reply.send(payload)
  })

  t.tearDown(server.close.bind(server))

  server.listen(0, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.deepEqual(payload, JSON.parse(body))
      t.strictEqual(res.statusCode, 200)
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (object)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world2' }

  server.get('/', async function awaitMyFunc (req, reply) {
    reply.send(payload)
    return { hello: 'world' }
  })

  t.tearDown(server.close.bind(server))

  server.listen(0, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.deepEqual(payload, JSON.parse(body))
      t.strictEqual(res.statusCode, 200)
    })
  })
})

test('await reply if we will be calling reply.send in the future', t => {
  const lines = ['incoming request', 'request completed']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const server = Fastify({
    logger: {
      stream: splitStream
    }
  })
  const payload = { hello: 'world' }

  server.get('/', async function awaitMyFunc (req, reply) {
    setImmediate(function () {
      reply.send(payload)
    })

    await reply
  })

  server.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('await reply if we will be calling reply.send in the future (error case)', t => {
  const lines = ['incoming request', 'kaboom', 'request completed']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.is(line.msg, lines.shift())
  })

  const server = Fastify({
    logger: {
      stream: splitStream
    }
  })

  server.get('/', async function awaitMyFunc (req, reply) {
    setImmediate(function () {
      reply.send(new Error('kaboom'))
    })

    await reply
  })

  server.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 500)
  })
})

test('support reply decorators with await', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.decorateReply('wow', function () {
    setImmediate(() => {
      this.send({ hello: 'world' })
    })
  })

  fastify.get('/', async (req, reply) => {
    await sleep(1)
    reply.wow()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.deepEqual(payload, { hello: 'world' })
  })
})

test('support 204', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    reply.code(204)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 204)
  })
})

test('inject async await', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  try {
    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }
})

test('inject async await - when the server is up', async t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  try {
    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }

  await sleep(200)

  try {
    const res2 = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res2.payload))
  } catch (err) {
    t.fail(err)
  }
})

test('async await plugin', async t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(async (fastify, opts) => {
    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    await sleep(200)
  })

  try {
    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }
})

test('does not call reply.send() twice if 204 response is already sent', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    reply.code(204).send()
    reply.send = () => {
      throw new Error('reply.send() was called twice')
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 204)
  })
})

test('error is logged because promise was fulfilled with undefined', t => {
  t.plan(3)

  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.tearDown(fastify.close.bind(fastify))

  fastify.get('/', async (req, reply) => {
    reply.code(200)
  })

  stream.once('data', line => {
    t.strictEqual(line.msg, 'Promise may not be fulfilled with \'undefined\' when statusCode is not 204')
  })

  fastify.listen(0, (err) => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/',
      timeout: 500
    }, (err, res, body) => {
      t.is(err.message, 'Request timed out')
    })
  })
})

test('error is not logged because promise was fulfilled with undefined but statusCode 204 was set', t => {
  t.plan(3)

  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.tearDown(fastify.close.bind(fastify))

  fastify.get('/', async (req, reply) => {
    reply.code(204)
  })

  stream.once('data', line => {
    t.fail('should not log an error')
  })

  fastify.listen(0, (err) => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.strictEqual(res.statusCode, 204)
    })
  })
})

test('error is not logged because promise was fulfilled with undefined but response was sent before promise resolution', t => {
  t.plan(4)

  let fastify = null
  const stream = split(JSON.parse)
  const payload = { hello: 'world' }
  try {
    fastify = Fastify({
      logger: {
        stream: stream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.tearDown(fastify.close.bind(fastify))

  fastify.get('/', async (req, reply) => {
    reply.send(payload)
  })

  stream.once('data', line => {
    t.fail('should not log an error')
  })

  fastify.listen(0, (err) => {
    t.error(err)
    fastify.server.unref()

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.strictEqual(res.statusCode, 200)
      t.deepEqual(
        payload,
        JSON.parse(body)
      )
    })
  })
})

test('Thrown Error instance sets HTTP status code', t => {
  t.plan(3)

  const fastify = Fastify()

  const err = new Error('winter is coming')
  err.statusCode = 418

  fastify.get('/', async (req, reply) => {
    throw err
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.error(error)
    t.strictEqual(res.statusCode, 418)
    t.deepEqual(
      {
        error: statusCodes['418'],
        message: err.message,
        statusCode: 418
      },
      JSON.parse(res.payload)
    )
  })
})

test('customErrorHandler support', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    const error = new Error('ouch')
    error.statusCode = 400
    throw error
  })

  fastify.setErrorHandler(async err => {
    t.is(err.message, 'ouch')
    const error = new Error('kaboom')
    error.statusCode = 401
    throw error
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 401)
    t.deepEqual(
      {
        error: statusCodes['401'],
        message: 'kaboom',
        statusCode: 401
      },
      JSON.parse(res.payload)
    )
  })
})

test('customErrorHandler support without throwing', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    const error = new Error('ouch')
    error.statusCode = 400
    throw error
  })

  fastify.setErrorHandler(async (err, req, reply) => {
    t.is(err.message, 'ouch')
    reply.code(401).send('kaboom')
    reply.send = t.fail.bind(t, 'should not be called')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 401)
    t.deepEqual(
      'kaboom',
      res.payload
    )
  })
})

// See https://github.com/fastify/fastify/issues/2653
test('customErrorHandler only called if reply not already sent', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    await reply.send('success')
    const error = new Error('ouch')
    error.statusCode = 400
    throw error
  })

  fastify.setErrorHandler(t.fail.bind(t, 'should not be called'))

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.strictEqual(res.statusCode, 200)
    t.deepEqual(
      'success',
      res.payload
    )
  })
})

test('await self', async t => {
  const app = Fastify()
  t.is(await app, app)
})
