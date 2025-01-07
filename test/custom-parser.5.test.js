'use strict'

const { test } = require('node:test')
const sget = require('simple-get').concat
const Fastify = require('../fastify')
const jsonParser = require('fast-json-body')
const { getServerUrl, plainTextParser } = require('./helper')

process.removeAllListeners('warning')

test('cannot remove all content type parsers after binding', (t, done) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.assert.throws(() => fastify.removeAllContentTypeParsers())
    fastify.close()
    done()
  })
})

test('cannot remove content type parsers after binding', (t, done) => {
  t.plan(2)

  const fastify = Fastify()

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.assert.throws(() => fastify.removeContentTypeParser('application/json'))
    done()
  })
})

test('should be able to override the default json parser after removeAllContentTypeParsers', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('application/json', function (req, payload, done) {
    t.assert.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
      done()
    })
  })
})

test('should be able to override the default plain text parser after removeAllContentTypeParsers', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()

  fastify.addContentTypeParser('text/plain', function (req, payload, done) {
    t.assert.ok('called')
    plainTextParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: 'hello world',
      headers: {
        'Content-Type': 'text/plain'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.strictEqual(body.toString(), 'hello world')
      fastify.close()
      done()
    })
  })
})

test('should be able to add a custom content type parser after removeAllContentTypeParsers', (t, done) => {
  t.plan(5)

  const fastify = Fastify()

  fastify.post('/', (req, reply) => {
    reply.send(req.body)
  })

  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser('application/jsoff', function (req, payload, done) {
    t.assert.ok('called')
    jsonParser(payload, function (err, body) {
      done(err, body)
    })
  })

  fastify.listen({ port: 0 }, err => {
    t.assert.ifError(err)

    sget({
      method: 'POST',
      url: getServerUrl(fastify),
      body: '{"hello":"world"}',
      headers: {
        'Content-Type': 'application/jsoff'
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 200)
      t.assert.deepStrictEqual(body.toString(), JSON.stringify({ hello: 'world' }))
      fastify.close()
      done()
    })
  })
})
