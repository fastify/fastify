'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('allow unsafe regex', t => {
  t.plan(4)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
    reply.send({ foo: req.params.foo })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        foo: '1234'
      })
    })
  })
})

test('allow unsafe regex not match', t => {
  t.plan(3)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/:foo(^[0-9]*$)', (req, reply) => {
    reply.send({ foo: req.params.foo })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/a1234'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})

test('allow unsafe regex not safe', t => {
  t.plan(1)

  const fastify = Fastify({
    allowUnsafeRegex: false
  })
  t.teardown(fastify.close.bind(fastify))

  t.throws(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })
})

test('allow unsafe regex not safe by default', t => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  t.throws(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })
})

test('allow unsafe regex allow unsafe', t => {
  t.plan(5)

  const fastify = Fastify({
    allowUnsafeRegex: true
  })
  t.teardown(fastify.close.bind(fastify))

  t.doesNotThrow(() => {
    fastify.get('/:foo(^([0-9]+){4}$)', (req, reply) => {
      reply.send({ foo: req.params.foo })
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        foo: '1234'
      })
    })
  })
})
