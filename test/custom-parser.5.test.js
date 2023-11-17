'use strict'

const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl, plainTextParser } = require('./helper')

process.removeAllListeners('warning')

test('cannot remove all content type parsers after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    t.throws(() => fastify.removeAllContentTypeParsers())
  })
})

test('cannot remove content type parsers after binding', t => {
  t.plan(2)

  const fastify = Fastify()

  t.teardown(fastify.close.bind(fastify))

  fastify.listen({ port: 0 }, function (err) {
    t.error(err)

    t.throws(() => fastify.removeContentTypeParser('application/json'))
  })
})

test('should be able to override the default json parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})

test('should be able to override the default plain text parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    t.ok('called')
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.equal(body.toString(), 'hello world')
      fastify.close()
    })
  })
})

test('should be able to add a custom content type parser after removeAllContentTypeParsers', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    t.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.error(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(response.statusCode, 200)
      t.same(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
    })
  })
})
