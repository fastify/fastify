'use strict'

const t = require('tap')
const Fastify = require('..')
const sget = require('simple-get').concat

t.test('The request id header key can be customized', async (t) => {
  t.plan(2)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'my-custom-request-id': REQUEST_ID } })
  const body = await response.json()
  t.equal(body.id, REQUEST_ID)
})

t.test('The request id header key can be customized', async (t) => {
  t.plan(2)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  const response = await fastify.inject({ method: 'GET', url: '/', headers: { 'MY-CUSTOM-REQUEST-ID': REQUEST_ID } })
  const body = await response.json()
  t.equal(body.id, REQUEST_ID)
})

t.test('The request id header key can be customized', (t) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: address,
      headers: {
        'my-custom-request-id': REQUEST_ID
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(body.toString(), `{"id":"${REQUEST_ID}"}`)
    })
  })
})

t.test('The request id header key can be customized', (t) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'my-custom-request-id'
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: address,
      headers: {
        'MY-CUSTOM-REQUEST-ID': REQUEST_ID
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(body.toString(), `{"id":"${REQUEST_ID}"}`)
    })
  })
})

t.test('The request id header key can be customized', (t) => {
  t.plan(4)
  const REQUEST_ID = '42'

  const fastify = Fastify({
    requestIdHeader: 'MY-CUSTOM-REQUEST-ID'
  })

  fastify.get('/', (req, reply) => {
    t.equal(req.id, REQUEST_ID)
    reply.send({ id: req.id })
  })

  fastify.listen({ port: 0 }, (err, address) => {
    t.error(err)
    t.teardown(() => fastify.close())

    sget({
      method: 'GET',
      url: address,
      headers: {
        'MY-CUSTOM-REQUEST-ID': REQUEST_ID
      }
    }, (err, response, body) => {
      t.error(err)
      t.equal(body.toString(), `{"id":"${REQUEST_ID}"}`)
    })
  })
})
