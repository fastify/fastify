'use strict'

const t = require('tap')
const test = t.test
const querystring = require('querystring')
const sget = require('simple-get').concat
const Fastify = require('..')

test('Custom querystring parser', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.strictEqual(str, 'foo=bar&baz=faz')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.deepEqual(req.query, {
      foo: 'bar',
      baz: 'faz'
    })
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, (err, address) => {
    t.error(err)
    t.tearDown(() => fastify.close())

    sget({
      method: 'GET',
      url: `${address}?foo=bar&baz=faz`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })

    fastify.inject({
      method: 'GET',
      url: `${address}?foo=bar&baz=faz`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('Custom querystring parser should be called also if there is nothing to parse', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.strictEqual(str, '')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.deepEqual(req.query, {})
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, (err, address) => {
    t.error(err)
    t.tearDown(() => fastify.close())

    sget({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })

    fastify.inject({
      method: 'GET',
      url: address
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('Querystring without value', t => {
  t.plan(9)

  const fastify = Fastify({
    querystringParser: function (str) {
      t.strictEqual(str, 'foo')
      return querystring.parse(str)
    }
  })

  fastify.get('/', (req, reply) => {
    t.deepEqual(req.query, { foo: '' })
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, (err, address) => {
    t.error(err)
    t.tearDown(() => fastify.close())

    sget({
      method: 'GET',
      url: `${address}?foo`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })

    fastify.inject({
      method: 'GET',
      url: `${address}?foo`
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('Custom querystring parser should be a function', t => {
  t.plan(1)

  try {
    Fastify({
      querystringParser: 10
    })
    t.fail('Should throw')
  } catch (err) {
    t.strictEqual(
      err.message,
      "querystringParser option should be a function, instead got 'number'"
    )
  }
})
