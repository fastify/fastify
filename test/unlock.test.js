'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

test('shorthand - unlock', t => {
  t.plan(1)
  try {
    fastify.unlock('/*', function (req, reply) {
      reply.code(204).send()
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
