'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('findRoute should return null when route cannot be found due to a different method', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.findRoute({
    method: 'POST',
    url: '/artists/:artistId'
  }), null)
})

test('findRoute should return an immutable route to avoid leaking and runtime route modifications', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  let route = fastify.findRoute({
    method: 'GET',
    url: '/artists/:artistId'
  })

  route.params = {
    ...route.params,
    id: ':id'
  }

  route = fastify.findRoute({
    method: 'GET',
    url: '/artists/:artistId'
  })
  t.deepEqual(route.params, { artistId: ':artistId' })
})

test('findRoute should return null when route cannot be found due to a different path', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.findRoute({
    method: 'GET',
    url: '/books/:bookId'
  }), null)
})

test('findRoute should return the route when found', t => {
  t.plan(2)
  const fastify = Fastify()

  const handler = (req, reply) => reply.send(typeof req.params.artistId)

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler
  })

  const route = fastify.findRoute({
    method: 'GET',
    url: '/artists/:artistId'
  })

  t.deepEqual(route.params, { artistId: ':artistId' })
  t.deepEqual(route.store.schema, { params: { artistId: { type: 'integer' } } })
})
