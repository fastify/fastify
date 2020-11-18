'use strict'

const { test } = require('tap')
const split = require('split2')
const Fastify = require('..')

test('skip automatic reply.send() with reply.sent = true and a body', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream: stream
    }
  })

  stream.on('data', (line) => {
    t.notEqual(line.level, 40) // there are no errors
    t.notEqual(line.level, 50) // there are no errors
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.resolve('this will be skipped')
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})

test('skip automatic reply.send() with reply.sent = true and no body', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream: stream
    }
  })

  stream.on('data', (line) => {
    t.notEqual(line.level, 40) // there are no error
    t.notEqual(line.level, 50) // there are no error
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.resolve()
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})

test('skip automatic reply.send() with reply.sent = true and an error', (t) => {
  const stream = split(JSON.parse)
  const app = Fastify({
    logger: {
      stream: stream
    }
  })

  let errorSeen = false

  stream.on('data', (line) => {
    if (line.level === 50) {
      errorSeen = true
      t.equal(line.err.message, 'kaboom')
      t.equal(line.msg, 'Promise errored, but reply.sent = true was set')
    }
  })

  app.get('/', (req, reply) => {
    reply.sent = true
    reply.raw.end('hello world')

    return Promise.reject(new Error('kaboom'))
  })

  return app.inject({
    method: 'GET',
    url: '/'
  }).then((res) => {
    t.equal(errorSeen, true)
    t.equal(res.statusCode, 200)
    t.equal(res.body, 'hello world')
  })
})
