'use strict'

const test = require('tap').test
const fastify = require('..')()

test('Fastify should throw on wrong options', t => {
  t.plan(2)
  try {
    const f = require('..')('lol') // eslint-disable-line
    t.fail()
  } catch (e) {
    t.is(e.message, 'Options must be an object')
    t.pass()
  }
})

test('Fastify should throw on multiple assignment to the same route', t => {
  t.plan(2)
  try {
    fastify.get('/', () => {})
    fastify.get('/', () => {})
    t.fail()
  } catch (e) {
    t.is(e.message, 'GET already set for /')
    t.pass()
  }
})

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
