'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('use semicolon delimiter default false', (t, done) => {
  t.plan(4)

  const fastify = Fastify()

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), {})
      fastify.close()
      done()
    })
  })
})

test('use semicolon delimiter set to true', (t, done) => {
  t.plan(4)
  const fastify = Fastify({
    useSemicolonDelimiter: true
  })

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), {
        foo: 'bar'
      })
      fastify.close()
      done()
    })
  })
})

test('use semicolon delimiter set to false', (t, done) => {
  t.plan(4)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(JSON.parse(body), {})
      fastify.close()
      done()
    })
  })
})

test('use semicolon delimiter set to false return 404', (t, done) => {
  t.plan(3)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 404)
      fastify.close()
      done()
    })
  })
})
