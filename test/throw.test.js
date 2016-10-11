'use strict'

const test = require('tap').test
const fastify = require('..')()

test('Should throw on unsupported method', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'TROLL',
      url: '/',
      schema: {},
      handler: function (req, reply) {}
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('Should throw on missing handler', t => {
  t.plan(1)
  try {
    fastify.route({
      method: 'GET',
      url: '/'
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})
