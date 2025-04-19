'use strict'

const { test, before, after } = require('node:test')
const fastify = require('..')()
const sgetAsync = require('./sget-async')

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

fastify.get('/return', opts, function (req, reply) {
  const promise = new Promise((resolve) => {
    resolve({ hello: 'world' })
  })
  return promise
})

fastify.get('/return-error', opts, function (req, reply) {
  const promise = new Promise((resolve, reject) => {
    reject(new Error('some error'))
  })
  return promise
})

fastify.get('/double', function (req, reply) {
  setTimeout(function () {
    // this should not throw
    reply.send({ hello: 'world' })
  }, 20)
  return Promise.resolve({ hello: '42' })
})

fastify.get('/thenable', opts, function (req, reply) {
  setImmediate(function () {
    reply.send({ hello: 'world' })
  })
  return reply
})

fastify.get('/thenable-error', opts, function (req, reply) {
  setImmediate(function () {
    reply.send(new Error('kaboom'))
  })
  return reply
})

fastify.get('/return-reply', opts, function (req, reply) {
  return reply.send({ hello: 'world' })
})

// Setup Fastify to listen before tests
before(async () => {
  try {
    await fastify.listen({ port: 0 })
  } catch (err) {
    throw new Error('Failed to start Fastify server')
  }
})

// Cleanup after all tests
after(() => {
  fastify.close()
})

test('shorthand - sget return promise es6 get', async (t) => {
  const { response, body } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/return`
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['content-length'], '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
})

test('shorthand - sget promise es6 get return error', async (t) => {
  const { response } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/return-error`
  })

  t.assert.strictEqual(response.statusCode, 500)
})

test('sget promise double send', async (t) => {
  const { response, body } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/double`
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: '42' })
})

test('thenable', async (t) => {
  const { response, body } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/thenable`
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['content-length'], '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
})

test('thenable (error)', async (t) => {
  const { response } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/thenable-error`
  })

  t.assert.strictEqual(response.statusCode, 500)
})

test('return-reply', async (t) => {
  const { response, body } = await sgetAsync({
    method: 'GET',
    url: `http://localhost:${fastify.server.address().port}/return-reply`
  })

  t.assert.strictEqual(response.statusCode, 200)
  t.assert.strictEqual(response.headers['content-length'], '' + body.length)
  t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
})
