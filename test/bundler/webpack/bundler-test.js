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

// In the webpack bundle context the fastify package.json is not read
// Because of this the version is set to `undefined`, this makes the plugin
// version check not able to work properly. By then this test shouldn't work
// in non-bundled environment but works in bundled environment
test('Bundled package should work with bad plugin version, undefined version fallback', t => {
  t.plan(1)
  fastifyFailPlugin.ready((err) => {
    t.error(err)
  })
})
