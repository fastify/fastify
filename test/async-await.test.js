'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('..')
const split = require('split2')
const pino = require('pino')
const { sleep } = require('./helper')
const statusCodes = require('node:http').STATUS_CODES

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

  fastify.listen({ port: 0 }, err => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/no-await'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], '' + body.length)
      t.same(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (undefined)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world' }

  server.get('/', async function awaitMyFunc (req, reply) {
    await reply.send(payload)
  })

  t.teardown(server.close.bind(server))

  server.listen({ port: 0 }, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.same(payload, JSON.parse(body))
      t.equal(res.statusCode, 200)
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (object)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world2' }

  server.get('/', async function awaitMyFunc (req, reply) {
    await reply.send(payload)
    return { hello: 'world' }
  })

  t.teardown(server.close.bind(server))

  server.listen({ port: 0 }, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.same(payload, JSON.parse(body))
      t.equal(res.statusCode, 200)
    })
  })
})

test('server logs an error if reply.send is called and a value is returned via async/await', t => {
  const lines = ['incoming request', 'request completed', 'Reply was already sent, did you forget to "return reply" in "/" (GET)?']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.equal(line.msg, lines.shift())
  })

  const logger = pino(splitStream)

  const fastify = Fastify({
    logger
  })

  fastify.get('/', async (req, reply) => {
    await reply.send({ hello: 'world' })
    return { hello: 'world2' }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (undefined)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world' }

  server.get('/', async function awaitMyFunc (req, reply) {
    await reply.send(payload)
  })

  t.teardown(server.close.bind(server))

  server.listen({ port: 0 }, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.same(payload, JSON.parse(body))
      t.equal(res.statusCode, 200)
    })
  })
})

test('ignore the result of the promise if reply.send is called beforehand (object)', t => {
  t.plan(4)

  const server = Fastify()
  const payload = { hello: 'world2' }

  server.get('/', async function awaitMyFunc (req, reply) {
    await reply.send(payload)
    return { hello: 'world' }
  })

  t.teardown(server.close.bind(server))

  server.listen({ port: 0 }, (err) => {
    t.error(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + server.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.same(payload, JSON.parse(body))
      t.equal(res.statusCode, 200)
    })
  })
})

test('await reply if we will be calling reply.send in the future', t => {
  const lines = ['incoming request', 'request completed']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.equal(line.msg, lines.shift())
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
    t.same(payload, { hello: 'world' })
  })
})

test('await reply if we will be calling reply.send in the future (error case)', t => {
  const lines = ['incoming request', 'kaboom', 'request completed']
  t.plan(lines.length + 2)

  const splitStream = split(JSON.parse)
  splitStream.on('data', (line) => {
    t.equal(line.msg, lines.shift())
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

    return this
  })

  fastify.get('/', async (req, reply) => {
    await sleep(1)
    await reply.wow()
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    const payload = JSON.parse(res.payload)
    t.same(payload, { hello: 'world' })
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
    t.same({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }
})

test('inject async await - when the server equal up', async t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  try {
    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.same({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }

  await sleep(200)

  try {
    const res2 = await fastify.inject({ method: 'GET', url: '/' })
    t.same({ hello: 'world' }, JSON.parse(res2.payload))
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
    t.same({ hello: 'world' }, JSON.parse(res.payload))
  } catch (err) {
    t.fail(err)
  }
})

test('does not call reply.send() twice if 204 response equal already sent', t => {
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

test('promise was fulfilled with undefined', t => {
  t.plan(4)

  let fastify = null
  const stream = split(JSON.parse)
  try {
    fastify = Fastify({
      logger: {
        stream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', async (req, reply) => {
  })

  stream.once('data', line => {
    t.fail('should not log an error')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.equal(res.body, undefined)
      t.equal(res.statusCode, 200)
    })
  })
})

test('promise was fulfilled with undefined using inject', async (t) => {
  const stream = split(JSON.parse)
  const fastify = Fastify({
    logger: {
      stream,
      level: 'error'
    }
  })

  fastify.get('/', async (req, reply) => {
  })

  stream.once('data', line => {
    t.fail('should not log an error')
  })

  const res = await fastify.inject('/')

  t.equal(res.body, '')
  t.equal(res.statusCode, 200)
})

test('error is not logged because promise was fulfilled with undefined but response was sent before promise resolution', t => {
  t.plan(4)

  let fastify = null
  const stream = split(JSON.parse)
  const payload = { hello: 'world' }
  try {
    fastify = Fastify({
      logger: {
        stream,
        level: 'error'
      }
    })
  } catch (e) {
    t.fail()
  }

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', async (req, reply) => {
    reply.send(payload)
  })

  stream.once('data', line => {
    t.fail('should not log an error')
  })

  fastify.listen({ port: 0 }, (err) => {
    t.error(err)
    t.teardown(() => { fastify.close() })

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/'
    }, (err, res, body) => {
      t.error(err)
      t.equal(res.statusCode, 200)
      t.same(
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
    t.equal(res.statusCode, 418)
    t.same(
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
    t.equal(err.message, 'ouch')
    const error = new Error('kaboom')
    error.statusCode = 401
    throw error
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 401)
    t.same(
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
    t.equal(err.message, 'ouch')
    await reply.code(401).send('kaboom')
    reply.send = t.fail.bind(t, 'should not be called')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 401)
    t.same(
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
    t.equal(res.statusCode, 200)
    t.same(
      'success',
      res.payload
    )
  })
})

// See https://github.com/fastify/fastify/issues/3209
test('setNotFoundHandler should accept return value', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', async () => ({ hello: 'world' }))

  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404)
    return {
      error: statusCodes['404'],
      message: 'lost',
      statusCode: 404
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/elsewhere'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 404)
    t.same(
      {
        error: statusCodes['404'],
        message: 'lost',
        statusCode: 404
      },
      JSON.parse(res.payload)
    )
  })
})

// See https://github.com/fastify/fastify/issues/3209
test('customErrorHandler should accept return value', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', async (req, reply) => {
    const error = new Error('ouch')
    error.statusCode = 400
    throw error
  })

  fastify.setErrorHandler((err, req, reply) => {
    t.equal(err.message, 'ouch')
    reply.code(401)
    return {
      error: statusCodes['401'],
      message: 'kaboom',
      statusCode: 401
    }
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.equal(res.statusCode, 401)
    t.same(
      {
        error: statusCodes['401'],
        message: 'kaboom',
        statusCode: 401
      },
      JSON.parse(res.payload)
    )
  })
})

test('await self', async t => {
  const app = Fastify()
  t.equal(await app, app)
})
