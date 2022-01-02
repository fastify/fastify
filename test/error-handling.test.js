'use strict'

const { test } = require('tap')
const Fastify = require('../fastify')

test('reply with "{error: true}" is sent', (t) => {
  t.plan(2)

  const app = Fastify()
  const payload = { error: true }

  app.setErrorHandler((_error, request, reply) => {
    reply.send(payload)
  })

  app.get('/', (request, reply) => {
    throw new Error('error 1')
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.same(res.json(), payload)
  })
})

test('serialized "error 2" is sent', (t) => {
  t.plan(2)

  const app = Fastify()

  app.setErrorHandler((_error, request, reply) => {
    throw new Error('error 2')
  })

  app.get('/', (request, reply) => {
    throw new Error('error 1')
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 500)
    t.has(res.json(), { message: 'error 2' })
  })
})

test('reply with "{error: true}" is sent and "error 2" is thrown', (t) => {
  t.plan(3)

  const app = Fastify()
  const payload = { error: true }
  const error = new Error('error 2')

  process.on('uncaughtException', (err) => {
    t.equal(err, error)
  })

  app.setErrorHandler((_error, request, reply) => {
    reply.send(payload)

    throw error
  })

  app.get('/', (request, reply) => {
    throw new Error('error 1')
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.same(res.json(), payload)
  })
})
