'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')
const sget = require('simple-get').concat

test('use semicolon delimiter default false', t => {
  t.plan(4)

  const fastify = Fastify({})

  t.teardown(fastify.close.bind(fastify))

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {})
    })
  })
})

test('use semicolon delimiter set to true', t => {
  t.plan(4)

  const fastify = Fastify({
    useSemicolonDelimiter: true
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {
        foo: 'bar'
      })
    })
  })
})

test('use semicolon delimiter set to false', t => {
  t.plan(4)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(JSON.parse(body), {})
    })
  })
})

test('use semicolon delimiter set to false return 404', t => {
  t.plan(3)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })
  t.teardown(fastify.close.bind(fastify))

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/1234;foo=bar'
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 404)
    })
  })
})
