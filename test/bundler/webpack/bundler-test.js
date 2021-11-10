'use strict'

const t = require('tap')
const test = t.test
const fastifySuccess = require('./dist/success')
const fastifyFailPlugin = require('./dist/failPlugin')

test('Bundled package should work', t => {
  t.plan(1)
  fastifySuccess.ready((err) => {
    t.error(err)
  })
})

test('Bundled package should not work with bad plugin version', t => {
  t.plan(1)
  fastifyFailPlugin.ready((err) => {
    t.ok(err)
  })
})
