'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('allow unsafe regex', (t, done) => {
  t.plan(4)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(() => fastify.close())

  fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
    reply.send({ foo: req.params.foo })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), {
        foo: '1234'
      })
      done()
    })
  })
})

test('allow unsafe regex not match', (t, done) => {
  t.plan(3)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(() => fastify.close())

  fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
    reply.send({ foo: req.params.foo })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/a1234'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 404)
      done()
    })
  })
})

test('allow unsafe regex not safe', (t, done) => {
  t.plan(1)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.after(() => fastify.close())

  t.assert.throws(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })
  done()
})

test('allow unsafe regex not safe by default', (t, done) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  t.assert.throws(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })
  done()
})

test('allow unsafe regex allow unsafe', (t, done) => {
  t.plan(5)

  const fastify = Fastify({
    allowUnsafeRegex: true
  })
  t.after(() => fastify.close())

  t.assert.doesNotThrow(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepEqual(JSON.parse(body), {
        foo: '1234'
      })
      done()
    })
  })
})
