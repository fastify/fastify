'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('hasContentTypeParser should know about internal parsers', t => {
  t.plan(4)
  const fastify = Fastify()
  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.hasContentTypeParser('application/json'))
    t.ok(fastify.hasContentTypeParser('text/plain'))
    t.notOk(fastify.hasContentTypeParser('application/jsoff'))
  })
})
