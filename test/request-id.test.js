'use strict'

const { test } = require('node:test')
const Fastify = require('..')
const sget = require('simple-get').concat

test('The request id header key can be customized', async (t) => {
  t.plan(2)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.assert.strictEqual(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'my-custom-request-id': REQUEST_ID } })
  const body = await response.json()
  t.assert.strictEqual(body.id, REQUEST_ID)
})

test('The request id header key can be customized', async (t) => {
  t.plan(2)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.assert.strictEqual(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'MY-CUSTOM-REQUEST-ID': REQUEST_ID } })
  const body = await response.json()
  t.assert.strictEqual(body.id, REQUEST_ID)
})

test('The request id header key can be customized', (t, done) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.assert.strictEqual(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: address,
      headers: {
        'my-custom-request-id': REQUEST_ID
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(body.toString(), `{"id":"${REQUEST_ID}"}`)
      done()
    })
  })
})

test('The request id header key can be customized', (t, done) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.assert.strictEqual(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: address,
      headers: {
        'MY-CUSTOM-REQUEST-ID': REQUEST_ID
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(body.toString(), `{"id":"${REQUEST_ID}"}`)
      done()
    })
  })
})

test('The request id header key can be customized', (t, done) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'MY-CUSTOM-REQUEST-ID'
  })

  fastify.get('/', (req, reply) => {
    t.assert.strictEqual(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  t.after(() => fastify.close())

  fastify.listen({ port: 0 }, (err, address) => {
    t.assert.ifError(err)

    sget({
      method: 'GET',
      url: address,
      headers: {
        'MY-CUSTOM-REQUEST-ID': REQUEST_ID
      }
    }, (err, response, body) => {
      t.assert.ifError(err)
      t.assert.strictEqual(body.toString(), `{"id":"${REQUEST_ID}"}`)
      done()
    })
  })
})
