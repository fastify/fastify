'use strict'

const semver = require('semver')
const tap = require('tap')

if (semver.gt(process.versions.node, '8.0.0')) {
  require('./async-await')(tap)
} else {
  tap.pass('Skip because Node version < 8')
  tap.end()
}
