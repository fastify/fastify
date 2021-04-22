'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('case insensitive', t => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        hello: 'world'
      })
    })
  })
})

test('case insensitive inject', t => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(response.payload), {
        hello: 'world'
      })
    })
  })
})

test('case insensitive (parametric)', t => {
  t.plan(5)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/foo/:param', (req, reply) => {
    t.equal(req.params.param, 'bAr')
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FoO/bAr'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        hello: 'world'
      })
    })
  })
})

test('case insensitive (wildcard)', t => {
  t.plan(5)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/foo/*', (req, reply) => {
    t.equal(req.params['*'], 'bAr/baZ')
    reply.send({ hello: 'world' })
  })

  fastify.listen(0, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FoO/bAr/baZ'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        hello: 'world'
      })
    })
  })
})
