'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('case insensitive', (t, done) => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.after(() => fastify.close())

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepEqual(JSON.parse(body), {
        hello: 'world'
      })
      done()
    })
  })
})

test('case insensitive inject', (t, done) => {
  t.plan(4)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.after(() => fastify.close())

  fastify.get('/foo', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    fastify.inject({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FOO'
    }, (err, response) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepEqual(JSON.parse(response.payload), {
        hello: 'world'
      })
      done()
    })
  })
})

test('case insensitive (parametric)', (t, done) => {
  t.plan(5)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.after(() => fastify.close())

  fastify.get('/foo/:param', (req, reply) => {
    t.assert.equal(req.params.param, 'bAr')
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FoO/bAr'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepEqual(JSON.parse(body), {
        hello: 'world'
      })
      done()
    })
  })
})

test('case insensitive (wildcard)', (t, done) => {
  t.plan(5)

  const fastify = Fastify({
    caseSensitive: false
  })
  t.after(() => fastify.close())

  fastify.get('/foo/*', (req, reply) => {
    t.assert.equal(req.params['*'], 'bAr/baZ')
    reply.send({ hello: 'world' })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/FoO/bAr/baZ'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.equal(response.statusCode, 200)
      t.assert.deepEqual(JSON.parse(body), {
        hello: 'world'
      })
      done()
    })
  })
})
