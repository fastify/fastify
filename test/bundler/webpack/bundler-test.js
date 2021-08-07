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

test('Bundler should fail with bad plugin version', t => {
  t.plan(2)
  fastifyFailPlugin.ready((err) => {
    t.ok(err)
    t.equal(err.code, 'FST_ERR_PLUGIN_VERSION_MISMATCH')
  })
})
