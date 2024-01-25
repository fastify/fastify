'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')
const fs = require('node:fs')
const semver = require('semver')
const { Readable } = require('node:stream')
const { fetch: undiciFetch } = require('undici')

if (semver.lt(process.versions.node, '18.0.0')) {
  t.skip('Response or ReadableStream not available, skipping test')
  process.exit(0)
}

test('should response with a ReadableStream', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = fs.createReadStream(__filename)
    reply.code(200).send(Readable.toWeb(stream))
  })

  const {
    statusCode,
    body
  } = await fastify.inject({ method: 'GET', path: '/' })

  const expected = await fs.promises.readFile(__filename)

  t.equal(statusCode, 200)
  t.equal(expected.toString(), body.toString())
})

test('should response with a Response', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = fs.createReadStream(__filename)
    reply.send(new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        hello: 'world'
      }
    }))
  })

  const {
    statusCode,
    headers,
    body
  } = await fastify.inject({ method: 'GET', path: '/' })

  const expected = await fs.promises.readFile(__filename)

  t.equal(statusCode, 200)
  t.equal(expected.toString(), body.toString())
  t.equal(headers.hello, 'world')
})

test('able to use in onSend hook - ReadableStream', async (t) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = fs.createReadStream(__filename)
    reply.code(500).send(Readable.toWeb(stream))
  })

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.equal(Object.prototype.toString.call(payload), '[object ReadableStream]')
    done(null, new Response(payload, {
      status: 200,
      headers: {
        hello: 'world'
      }
    }))
  })

  const {
    statusCode,
    headers,
    body
  } = await fastify.inject({ method: 'GET', path: '/' })

  const expected = await fs.promises.readFile(__filename)

  t.equal(statusCode, 200)
  t.equal(expected.toString(), body.toString())
  t.equal(headers.hello, 'world')
})

test('able to use in onSend hook - Response', async (t) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    const stream = fs.createReadStream(__filename)
    reply.send(new Response(Readable.toWeb(stream), {
      status: 500,
      headers: {
        hello: 'world'
      }
    }))
  })

  fastify.addHook('onSend', (request, reply, payload, done) => {
    t.equal(Object.prototype.toString.call(payload), '[object Response]')
    done(null, new Response(payload.body, {
      status: 200,
      headers: payload.headers
    }))
  })

  const {
    statusCode,
    headers,
    body
  } = await fastify.inject({ method: 'GET', path: '/' })

  const expected = await fs.promises.readFile(__filename)

  t.equal(statusCode, 200)
  t.equal(expected.toString(), body.toString())
  t.equal(headers.hello, 'world')
})

test('Error when Response.bodyUsed', async (t) => {
  t.plan(4)

  const expected = await fs.promises.readFile(__filename)

  const fastify = Fastify()

  fastify.get('/', async function (request, reply) {
    const stream = fs.createReadStream(__filename)
    const response = new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        hello: 'world'
      }
    })
    const file = await response.text()
    t.equal(expected.toString(), file)
    t.equal(response.bodyUsed, true)
    return reply.send(response)
  })

  const response = await fastify.inject({ method: 'GET', path: '/' })

  t.equal(response.statusCode, 500)
  const body = response.json()
  t.equal(body.code, 'FST_ERR_REP_RESPONSE_BODY_CONSUMED')
})

test('allow to pipe with fetch', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (request, reply) {
    return fetch(`${fastify.listeningOrigin}/fetch`, {
      method: 'GET'
    })
  })

  fastify.get('/fetch', function (request, reply) {
    reply.code(200).send({ ok: true })
  })

  await fastify.listen()

  const response = await fastify.inject({ method: 'GET', path: '/' })

  t.equal(response.statusCode, 200)
  t.same(response.json(), { ok: true })
})

test('allow to pipe with undici.fetch', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/', function (request, reply) {
    return undiciFetch(`${fastify.listeningOrigin}/fetch`, {
      method: 'GET'
    })
  })

  fastify.get('/fetch', function (request, reply) {
    reply.code(200).send({ ok: true })
  })

  await fastify.listen()

  const response = await fastify.inject({ method: 'GET', path: '/' })

  t.equal(response.statusCode, 200)
  t.same(response.json(), { ok: true })
})
