'use strict'

const t = require('tap')
const semver = require('semver')

if (semver.gt(process.versions.node, '8.0.0')) {
  require('./fluent-schema')(t)
} else {
  t.pass('Skip because Node version < 8')
  t.end()
}
