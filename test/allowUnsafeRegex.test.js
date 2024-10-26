'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('allow unsafe regex', async t => {
  t.plan(4)
  const abortController = new AbortController()
  const { signal } = abortController

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(() => {
    fastify.close()
    abortController.abort()
  })

  await new Promise((resolve) => {
    fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })

    fastify.listen({ port: 0 }, err => {
      t.assert.ifError(err)

      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/1234',
        signal
      }, (err, response, body) => {
        console.log('jdlafj')
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), {
          foo: '1234'
        })
        resolve()
      })
    })
  })
})

test('allow unsafe regex not match', async t => {
  t.plan(3)
  const abortController = new AbortController()
  const { signal } = abortController

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(() => {
    fastify.close()
    abortController.abort()
  })

  await new Promise((resolve) => {
    fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })

    fastify.listen({ port: 0 }, err => {
      t.assert.ifError(err)

      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/a1234',
        signal
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 404)
        resolve()
      })
    })
  })
})

test('allow unsafe regex not safe', t => {
  t.plan(1)
  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(fastify.close())

  t.assert.throws(
    () => {
      fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
        reply.send({ foo: req.params.foo })
      })
    },
    Error)
})

test('allow unsafe regex not safe by default', t => {
  t.plan(1)

  const fastify = Fastify()
  t.after(
    fastify.close())

  t.assert.throws(
    () => {
      fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
        reply.send({ foo: req.params.foo })
      })
    },
    Error)
})

test('allow unsafe regex allow unsafe', async t => {
  t.plan(5)
  const abortController = new AbortController()
  const { signal } = abortController

  const fastify = Fastify({
    allowUnsafeRegex: true
  })
  t.after(() => {
    fastify.close()
    abortController.abort()
  })

  await new Promise((resolve) => {
    t.assert.doesNotThrow(() => {
      fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
        reply.send({ foo: req.params.foo })
      })
    })

    fastify.listen({ port: 0 }, err => {
      t.assert.ifError(err)

      sget({
        method: 'GET',
        url: 'http://localhost:' + fastify.server.address().port + '/1234',
        signal
      }, (err, response, body) => {
        t.assert.ifError(err)
        t.assert.strictEqual(response.statusCode, 200)
        t.assert.deepStrictEqual(JSON.parse(body), {
          foo: '1234'
        })
        resolve()
      })
    })
  })
})
