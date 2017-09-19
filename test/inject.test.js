'use strict'

const t = require('tap')
const test = t.test
const Stream = require('stream')
const util = require('util')
const Fastify = require('..')

test('inject should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.inject)
  t.is(typeof fastify.inject, 'function')
})

test('should wait for the ready event', t => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.register((instance, opts, next) => {
    instance.get('/', (req, reply) => {
      reply.send(payload)
    })

    setTimeout(next, 500)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request', t => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request - code check', t => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.get('/', (req, reply) => {
    reply.code(201).send(payload)
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 201)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request - headers check', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.header('content-type', 'text/plain').send('')
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.strictEqual('', res.payload)
    t.strictEqual(res.headers['content-type'], 'text/plain')
    t.strictEqual(res.headers['content-length'], 0)
  })
})

test('inject get request - querystring', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(req.query)
  })

  fastify.inject({
    method: 'GET',
    url: '/?hello=world'
  }, res => {
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request - params', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/:hello', (req, reply) => {
    reply.send(req.params)
  })

  fastify.inject({
    method: 'GET',
    url: '/world'
  }, res => {
    t.deepEqual({ hello: 'world' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request - wildcard', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/test/*', (req, reply) => {
    reply.send(req.params)
  })

  fastify.inject({
    method: 'GET',
    url: '/test/wildcard'
  }, res => {
    t.deepEqual({ '*': 'wildcard' }, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 16)
  })
})

test('inject get request - headers', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(req.headers)
  })

  fastify.inject({
    method: 'GET',
    url: '/',
    headers: { hello: 'world' }
  }, res => {
    t.strictEqual('world', JSON.parse(res.payload).hello)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 59)
  })
})

test('inject post request', t => {
  t.plan(3)
  const fastify = Fastify()
  const payload = { hello: 'world' }

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: payload
  }, res => {
    t.deepEqual(payload, JSON.parse(res.payload))
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject post request - send stream', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'application/json' },
    payload: getStream()
  }, res => {
    t.deepEqual('{"hello":"world"}', res.payload)
    t.strictEqual(res.statusCode, 200)
    t.strictEqual(res.headers['content-length'], 17)
  })
})

test('inject get request - reply stream', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.get('/', (req, reply) => {
    reply.send(getStream())
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, res => {
    t.deepEqual('{"hello":"world"}', res.payload)
    t.strictEqual(res.statusCode, 200)
  })
})

// https://github.com/hapijs/shot/blob/master/test/index.js#L836
function getStream () {
  const Read = function () {
    Stream.Readable.call(this)
  }
  util.inherits(Read, Stream.Readable)
  const word = '{"hello":"world"}'
  var i = 0

  Read.prototype._read = function (size) {
    this.push(word[i] ? word[i++] : null)
  }

  return new Read()
}
