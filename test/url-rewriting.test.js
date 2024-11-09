'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('Should rewrite url', (t, done) => {
  t.plan(5)
  const fastify = Fastify({
    rewriteUrl (req) {
      t.assert.strictEqual(req.url, '/this-would-404-without-url-rewrite')
      this.log.info('rewriting url')
      return '/'
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)

    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/this-would-404-without-url-rewrite'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.deepStrictEqual(JSON.parse(body), { hello: 'world' })
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})

test('Should not rewrite if the url is the same', (t, done) => {
  t.plan(4)
  const fastify = Fastify({
    rewriteUrl (req) {
      t.assert.strictEqual(req.url, '/this-would-404-without-url-rewrite')
      this.log.info('rewriting url')
      return req.url
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/this-would-404-without-url-rewrite'
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(response.statusCode, 404)
      done()
    })
  })
})

test('Should throw an error', (t, done) => {
  t.plan(5)
  const fastify = Fastify({
    rewriteUrl (req) {
      t.assert.strictEqual(req.url, '/this-would-404-without-url-rewrite')
      this.log.info('rewriting url')
      return undefined
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world' })
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/this-would-404-without-url-rewrite'
    }, (err, response, body) => {
      t.assert.strictEqual(err.code, 'ECONNRESET')
      t.assert.strictEqual(response, undefined)
      t.assert.strictEqual(body, undefined)
      done()
    })
  })
})

test('Should rewrite url but keep originalUrl unchanged', (t, done) => {
  t.plan(7)
  const fastify = Fastify({
    rewriteUrl (req) {
      t.assert.strictEqual(req.url, '/this-would-404-without-url-rewrite')
      t.assert.strictEqual(req.originalUrl, '/this-would-404-without-url-rewrite')
      return '/'
    }
  })

  fastify.route({
    method: 'GET',
    url: '/',
    handler: (req, reply) => {
      reply.send({ hello: 'world', hostname: req.hostname, port: req.port })
      t.assert.strictEqual(req.originalUrl, '/this-would-404-without-url-rewrite')
    }
  })

  fastify.listen({ port: 0 }, function (err) {
    t.assert.ifError(err)
    t.after(() => fastify.close())
    sget({
      method: 'GET',
      url: 'http://localhost:' + fastify.server.address().port + '/this-would-404-without-url-rewrite'
    }, (err, response, body) => {
      t.assert.ifError(err)
      const parsedBody = JSON.parse(body)
      t.assert.deepStrictEqual(parsedBody, { hello: 'world', hostname: 'localhost', port: fastify.server.address().port })
      t.assert.strictEqual(response.statusCode, 200)
      done()
    })
  })
})
