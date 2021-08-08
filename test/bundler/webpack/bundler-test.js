'use strict'

const t = require('tap')
const test = t.test
const fastifySuccess = require('./dist/success')
const fastifyFailPlugin = require('./dist/failPlugin')

test('Bundler should work', t => {
  t.plan(1)
  fastifySuccess.ready((err) => {
    t.error(err)
  })
})

// Untill there is no proper solution for bundlers, the fastify version
// is set to undefined for this context
test('Bundler should work with bad plugin version, undefined version', t => {
  t.plan(1)
  fastifyFailPlugin.ready((err) => {
    t.error(err)
  })
})
