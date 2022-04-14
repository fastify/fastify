'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

test('shorthand - mkcol', t => {
  t.plan(1)
  try {
    fastify.mkcol('/*', function (req, reply) {
      reply.code(201).send('ok')
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
