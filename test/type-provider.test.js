'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Should export withTypeProvider function', t => {
  t.plan(1)
  try {
    Fastify().withTypeProvider()
    t.pass()
  } catch (e) {
    t.fail()
  }
})

test('Should return same instance', t => {
  t.plan(1)
  const fastify = Fastify()
  t.equal(fastify, fastify.withTypeProvider())
})
