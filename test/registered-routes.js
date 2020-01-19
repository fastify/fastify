'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('registered routes - basic', t => {
  t.plan(11)

  const fastify = Fastify()
  fastify.get('/test', () => {})
  fastify.post('/test/:hello', () => {})

  fastify.ready(() => {
    const routes = fastify.registeredRoutes()
    t.ok(Array.isArray(routes))
    const [get, post] = routes
    t.is(get.method, 'GET')
    t.is(get.path, '/test')
    t.ok(get.opts)
    t.ok(get.handler)
    t.ok(get.store)
    t.is(post.method, 'POST')
    t.is(post.path, '/test/:hello')
    t.ok(post.opts)
    t.ok(post.handler)
    t.ok(post.store)
  })
})

test('registered routes - all', t => {
  t.plan(36)

  const fastify = Fastify()
  fastify.all('/hello/*', () => {})

  fastify.ready(() => {
    const routes = fastify.registeredRoutes()
    t.ok(Array.isArray(routes))
    // routes for all are ordered alphabetically:
    const [del, get, head, patch, post, put, options] = routes
    t.is(del.method, 'DELETE')
    t.is(del.path, '/hello/*')
    t.ok(del.opts)
    t.ok(del.handler)
    t.ok(del.store)
    t.is(get.method, 'GET')
    t.is(get.path, '/hello/*')
    t.ok(get.opts)
    t.ok(get.handler)
    t.ok(get.store)
    t.is(head.method, 'HEAD')
    t.is(head.path, '/hello/*')
    t.ok(head.opts)
    t.ok(head.handler)
    t.ok(head.store)
    t.is(patch.method, 'PATCH')
    t.is(patch.path, '/hello/*')
    t.ok(patch.opts)
    t.ok(patch.handler)
    t.ok(patch.store)
    t.is(post.method, 'POST')
    t.is(post.path, '/hello/*')
    t.ok(post.opts)
    t.ok(post.handler)
    t.ok(post.store)
    t.is(put.method, 'PUT')
    t.is(put.path, '/hello/*')
    t.ok(put.opts)
    t.ok(put.handler)
    t.ok(put.store)
    t.is(options.method, 'OPTIONS')
    t.is(options.path, '/hello/*')
    t.ok(options.opts)
    t.ok(options.handler)
    t.ok(options.store)
  })
})

test('registered routes - options / versions', t => {
  t.plan(11)

  const fastify = Fastify()
  fastify.get('/hello', { version: 1 }, () => {})
  fastify.get('/hello', { version: 2 }, () => {})

  fastify.ready(() => {
    const routes = fastify.registeredRoutes()
    t.ok(Array.isArray(routes))
    const [v1, v2] = routes
    t.is(v1.method, 'GET')
    t.is(v1.path, '/hello')
    t.is(v1.opts.version, 1)
    t.ok(v1.handler)
    t.ok(v1.store)
    t.is(v2.method, 'GET')
    t.is(v2.path, '/hello')
    t.is(v2.opts.version, 2)
    t.ok(v2.handler)
    t.ok(v2.store)
  })
})

test('registered routes - schemas', t => {
  t.plan(6)

  const fastify = Fastify()
  const schema = {
    querystring: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        excitement: { type: 'integer' }
      }
    }
  }
  fastify.get('/test', { schema }, () => {})

  fastify.ready(() => {
    const routes = fastify.registeredRoutes()
    t.ok(Array.isArray(routes))
    const [get] = routes
    t.is(get.method, 'GET')
    t.is(get.path, '/test')
    t.ok(get.opts)
    t.ok(get.handler)
    t.same(get.store.schema, schema)
  })
})
