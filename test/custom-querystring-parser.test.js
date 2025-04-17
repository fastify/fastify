'use strict'

const { test } = require('node:test')
const querystring = require('node:querystring')
const sget = require('simple-get').concat
const Fastify = require('..')
const { waitForCb } = require('./toolkit')

test('Custom querystring parser', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.assert.strictEqual(str, 'foo=bar&baz=faz')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.assert.deepEqual(req.query, {
      foo: 'bar',
      baz: 'faz'
    })
    reply.send({ hello: 'world' })
  })

  const completion = waitForCb({ steps: 2 })

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: `${address}?foo=bar&baz=faz`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })

    fastify.inject({
      method: 'GET',
      url: `${address}?foo=bar&baz=faz`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })
  })

  return completion.patience
})

test('Custom querystring parser should be called also if there is nothing to parse', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.assert.strictEqual(str, '')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.assert.deepEqual(req.query, {})
    reply.send({ hello: 'world' })
  })

  const completion = waitForCb({ steps: 2 })

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })

    fastify.inject({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })
  })

  return completion.patience
})

test('Querystring without value', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.assert.strictEqual(str, 'foo')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.assert.deepEqual(req.query, { foo: '' })
    reply.send({ hello: 'world' })
  })

  const completion = waitForCb({ steps: 2 })

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)
    t.after(() => fastify.close())

    sget({
      method: 'GET',
      url: `${address}?foo`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })

    fastify.inject({
      method: 'GET',
      url: `${address}?foo`
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      completion.stepIn()
    })
  })

  return completion.patience
})

test('Custom querystring parser should be a function', t => {
  t.plan(1)

  try {
    Fastify({
      querystringParser: 10
    })
    t.assert.fail('Should throw')
  } catch (err) {
    t.assert.strictEqual(
      err.message,
      "querystringParser option should be a function, instead got 'number'"
    )
  }
})
