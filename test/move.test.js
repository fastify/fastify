'use strict'

const t = require('tap')
const test = t.test
const fastify = require('..')()

test('shorthand - move', t => {
  t.plan(1)
  try {
    fastify.move('/*', function (req, reply) {
      reply.code(201).send('ok')
    })
    t.pass()
  } catch (e) {
    t.fail()
  }
})
