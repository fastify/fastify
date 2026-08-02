'use strict'

const { describe, test } = require('node:test')
const Fastify = require('..')

describe('RFC 10008', () => {
  test('support adding QUERY method though fastify.route', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    fastify.route({
      method: 'QUERY',
      url: '/query',
      handler: function (request, reply) {
        reply.send(request.body)
      }
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hello: 'world' })
    })

    t.assert.equal(res.statusCode, 200)
    t.assert.equal(res.json().hello, 'world')
  })

  test('support adding QUERY method though fastify.query', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    fastify.query('/query', function (request, reply) {
      reply.send(request.body)
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hello: 'world' })
    })

    t.assert.equal(res.statusCode, 200)
    t.assert.equal(res.json().hello, 'world')
  })

  /**
   * https://datatracker.ietf.org/doc/html/rfc10008#section-2.1
   */

  test('should return 400 if Content-Type header is missing for QUERY method', async (t) => {
    // If a request lacks media type information, it is
    // incorrect by definition and needs to fail with a
    // 4xx status code such as 400 (Client Error).
    t.plan(2)

    const fastify = Fastify()
    fastify.query('/query', function (request, reply) {
      reply.send(request.body)
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      body: JSON.stringify({ hello: 'world' })
    })

    t.assert.equal(res.statusCode, 400)
    t.assert.equal(res.json().code, 'FST_ERR_ROUTE_MISSING_CONTENT_TYPE')
  })

  test('should return 400 if invalid content is provided for QUERY method', async (t) => {
    // If a media type is specified but is inconsistent
    // with the actual request content, a 400 (Bad Request)
    // can be returned. That is, a server is not allowed to
    // infer a media type from the request content and then
    // override a missing or "erroneous" value (i.e., "content sniffing").
    t.plan(2)

    const fastify = Fastify()
    fastify.query('/query', function (request, reply) {
      reply.send(request.body)
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      headers: { 'Content-Type': 'application/json' },
      body: 'it is not a valid json'
    })

    t.assert.equal(res.statusCode, 400)
    t.assert.equal(res.json().code, 'FST_ERR_CTP_INVALID_JSON_BODY')
  })

  test('should return 400 if no content is provided for QUERY method', async (t) => {
    // If a media type is specified but is inconsistent
    // with the actual request content, a 400 (Bad Request)
    // can be returned. That is, a server is not allowed to
    // infer a media type from the request content and then
    // override a missing or "erroneous" value (i.e., "content sniffing").
    t.plan(2)

    const fastify = Fastify()
    fastify.query('/query', function (request, reply) {
      reply.send(request.body)
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      headers: { 'Content-Type': 'application/json' }
    })

    t.assert.equal(res.statusCode, 400)
    t.assert.equal(res.json().code, 'FST_ERR_ROUTE_MISSING_CONTENT')
  })

  test('should return 415 if unsupported media type is provided for QUERY method', async (t) => {
    // If a media type is specified but is not supported by the
    // resource, a 415 (Unsupported Media Type) is appropriate.
    t.plan(2)

    const fastify = Fastify()
    fastify.query('/query', function (request, reply) {
      reply.send(request.body)
    })
    await fastify.ready()

    const res = await fastify.inject({
      method: 'QUERY',
      url: '/query',
      headers: { 'Content-Type': 'application/ld+json' },
      body: JSON.stringify({ hello: 'world' })
    })

    t.assert.equal(res.statusCode, 415)
    t.assert.equal(res.json().code, 'FST_ERR_CTP_INVALID_MEDIA_TYPE')
  })
})
