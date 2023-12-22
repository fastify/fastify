'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('validateRouteParams should return false when route cannot be found', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.validateRouteParams({
    method: 'POST',
    url: '/artists'
  }), false)
})

test('validateRouteParams should return true when declared params match schema params', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.validateRouteParams({
    method: 'GET',
    url: '/artists/:artistId'
  }), true)
})

test('validateRouteParams should return false when declared param is different from the one in the schema', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { id: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.validateRouteParams({
    method: 'GET',
    url: '/artists/:id'
  }), false)
})

test('validateRouteParams should return false when declared params are more than ones in the schema', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId/tracks/:trackId', {
    schema: {
      params: { artistId: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.validateRouteParams({
    method: 'GET',
    url: '/artists/1/tracks/2'
  }), false)
})

test('validateRouteParams should return false when declared params are less than ones in the schema', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.get('/artists/:artistId', {
    schema: {
      params: { artistId: { type: 'integer' }, id: { type: 'integer' } }
    },
    handler: (req, reply) => reply.send(typeof req.params.artistId)
  })

  t.equal(fastify.validateRouteParams({
    method: 'GET',
    url: '/artists/1'
  }), false)
})
