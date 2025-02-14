'use strict'

const { test } = require('node:test')
const Fastify = require('..')

test('use semicolon delimiter default false', async (t) => {
  t.plan(2)

  const fastify = Fastify()

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/1234;foo=bar', {
    method: 'GET'
  })
  t.assert.strictEqual(result.status, 200)
  const body = await result.json()
  t.assert.deepStrictEqual(body, {})
})

test('use semicolon delimiter set to true', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    useSemicolonDelimiter: true
  })

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/1234;foo=bar')
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
  t.assert.deepStrictEqual(await result.json(), {
    foo: 'bar'
  })
})

test('use semicolon delimiter set to false', async (t) => {
  t.plan(3)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })

  fastify.get('/1234;foo=bar', (req, reply) => {
    reply.send(req.query)
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/1234;foo=bar')
  t.assert.ok(result.ok)
  t.assert.strictEqual(result.status, 200)
  t.assert.deepStrictEqual(await result.json(), {})
})

test('use semicolon delimiter set to false return 404', async (t) => {
  t.plan(2)

  const fastify = Fastify({
    useSemicolonDelimiter: false
  })

  fastify.get('/1234', (req, reply) => {
    reply.send(req.query)
  })

  const fastifyServer = await fastify.listen({ port: 0 })
  t.after(() => { fastify.close() })

  const result = await fetch(fastifyServer + '/1234;foo=bar')
  t.assert.ok(!result.ok)
  t.assert.strictEqual(result.status, 404)
})

test('use routerOptions semicolon delimiter default false', (t, done) => {
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

test('use routerOptions semicolon delimiter set to true', (t, done) => {
  t.plan(4)
  const fastify = Fastify({
    routerOptions: {
      useSemicolonDelimiter: true
    }
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

test('use routerOptions semicolon delimiter set to false', (t, done) => {
  t.plan(4)

  const fastify = Fastify({
    routerOptions: {
      useSemicolonDelimiter: false
    }
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

test('use routerOptions semicolon delimiter set to false return 404', (t, done) => {
  t.plan(3)

  const fastify = Fastify({
    routerOptions: {
      useSemicolonDelimiter: false
    }
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
