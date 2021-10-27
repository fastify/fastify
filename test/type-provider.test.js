'use strict'

const { test } = require('tap')
const Fastify = require('..')

test('Type Provider function is defined', t => {
  t.plan(1)
  try {
    Fastify().typeProvider()
    t.pass()
  } catch (e) {
    t.fail()
  }
})
