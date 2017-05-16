'use strict'

const t = require('tap')
const test = t.test
const safeStringify = require('fast-safe-stringify')
const Fastify = require('..')
const statusCodes = require('../lib/status-codes.json')
const boom = require('boom')

const codes = Object.keys(statusCodes)
codes.forEach(code => {
  if (Number(code) >= 400) helper(code)
})

function helper (code) {
  test('Reply error handling - code: ' + code, t => {
    t.plan(2)
    const fastify = Fastify()
    const err = new Error('winter is coming')

    fastify.get('/', (req, reply) => {
      reply
        .code(Number(code))
        .send(err)
    })

    fastify.inject({
      method: 'GET',
      url: '/'
    }, res => {
      t.strictEqual(res.statusCode, Number(code))
      t.deepEqual(
        {
          error: statusCodes[code],
          message: err.message,
          statusCode: Number(code)
        },
        JSON.parse(res.payload)
      )
    })
  })
}

test('preHandler hook error handling with external code', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('preHandler', (req, reply, done) => {
    reply.code(400)
    done(err)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('preHandler hook error handling with code inside done', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('preHandler', (req, reply, done) => {
    done(err, 400)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('preRouting hook error handling with code inside done', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('preRouting', (req, reply, done) => {
    done(err, 400)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('onRequest hook error handling with code inside done', t => {
  t.plan(2)
  const fastify = Fastify()
  const err = new Error('winter is coming')

  fastify.addHook('onRequest', (req, reply, done) => {
    done(err, 400)
  })

  fastify.get('/', () => {})

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 400)
    t.deepEqual(
      {
        error: statusCodes['400'],
        message: err.message,
        statusCode: 400
      },
      JSON.parse(res.payload)
    )
  })
})

test('support for boom', t => {
  t.plan(2)
  const fastify = Fastify()
  const boomObject = boom.create(500, 'winter is coming', { hello: 'world' })

  fastify.get('/', (req, reply) => {
    reply.send(boomObject)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual(res.statusCode, 500)
    t.deepEqual(
      // we are doing this because Boom creates also a stack that is stripped during the stringify phase
      JSON.parse(safeStringify(boomObject)),
      JSON.parse(res.payload)
    )
  })
})
