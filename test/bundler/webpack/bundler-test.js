'use strict'

const t = require('tap')
const test = t.test
const fastifySuccess = require('./dist/success')

test('Bundled package should work', t => {
  t.plan(1)
  fastifySuccess.ready((err) => {
    t.error(err)
  })
})
