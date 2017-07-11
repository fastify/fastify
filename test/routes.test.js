'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('fastify can be iterated to get all the routes', t => {
  t.plan(11)
  const fastify = Fastify()

  fastify.get('/', () => {})
  fastify.post('/', () => {})
  fastify.get('/test', () => {})

  t.is(typeof fastify[Symbol.iterator], 'function')

  fastify.ready(() => {
    for (let route of fastify) {
      t.ok(route['/'] || route['/test'])

      if (route['/']) {
        t.ok(route['/'].get)
        t.ok(route['/'].post)
      }

      if (route['/test']) {
        t.ok(route['/test'].get)
      }
    }

    // double check, because we do not want
    // to exhaust things
    for (let route of fastify) {
      t.ok(route['/'] || route['/test'])

      if (route['/']) {
        t.ok(route['/'].get)
        t.ok(route['/'].post)
      }

      if (route['/test']) {
        t.ok(route['/test'].get)
      }
    }
  })
})
