'use strict'

const t = require('tap')
const test = t.test
const request = require('request')
const Fastify = require('..')
const jsonParser = require('body/json')

test('custom parser methods should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.addParseStrategy)
  t.ok(fastify.hasParser)
})

test('addParseStrategy should add a custom parser', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addParseStrategy('application/jsoff', function (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  })

  fastify.listen(0, err => {
    t.error(err)

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})

test('addParseStrategy should handle multiple custom parsers', t => {
  t.plan(7)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.post('/hello', (req, reply) => {
    reply.send(req.body)
  })

  function customParser (req, done) {
    jsonParser(req, function (err, body) {
      if (err) return done(err)
      done(body)
    })
  }

  fastify
    .addParseStrategy('application/jsoff', customParser)
    .addParseStrategy('application/ffosj', customParser)

  fastify.listen(0, err => {
    t.error(err)
    fastify.server.unref()

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
    })

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port + '/hello',
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/ffosj'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(body, JSON.stringify({ hello: 'world' }))
    })
  })
})

test('addParseStrategy should handle errors', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.addParseStrategy('application/jsoff', function (req, done) {
    done(new Error('kaboom!'))
  })

  fastify.listen(0, err => {
    t.error(err)

    request({
      method: 'POST',
      uri: 'http://localhost:' + fastify.server.address().port,
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 500)
      fastify.close()
    })
  })
})
