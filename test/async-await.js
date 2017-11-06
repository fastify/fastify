'use strict'

const sget = require('simple-get').concat
const Fastify = require('..')
const sleep = require('then-sleep')
const split = require('split2')
const pino = require('pino')
const statusCodes = require('http').STATUS_CODES

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

function asyncTest (t) {
  const test = t.test

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
    const lines = ['incoming request', 'Reply already sent', 'request completed']
    t.plan(lines.length + 1)

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
    }, res => {
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

  test('support reply decorators with await', t => {
    t.plan(1)

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
    }, res => {
      const payload = JSON.parse(res.payload)
      t.deepEqual(payload, { hello: 'world' })
    })
  })

  test('support 204', t => {
    t.plan(1)

    const fastify = Fastify()

    fastify.get('/', async (req, reply) => {
      reply.code(204)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, res => {
      t.equal(res.statusCode, 204)
    })
  })

  test('inject async await', async t => {
    t.plan(1)

    const fastify = Fastify()

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
  })

  test('inject async await - when the server is up', async t => {
    t.plan(2)

    const fastify = Fastify()

    fastify.get('/', (req, reply) => {
      reply.send({ hello: 'world' })
    })

    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))

    await sleep(200)

    const res2 = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res2.payload))
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

    const res = await fastify.inject({ method: 'GET', url: '/' })
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
  })

  test('Thrown Error instance sets HTTP status code', t => {
    t.plan(2)

    const fastify = Fastify()

    const err = new Error('winter is coming')
    err.statusCode = 418

    fastify.get('/', async (req, reply) => {
      throw err
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, res => {
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
}

module.exports = asyncTest
