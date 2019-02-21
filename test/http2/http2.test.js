'use strict'

const semver = require('semver')
const tap = require('tap')

if (semver.gt(process.versions.node, '8.8.0')) {
  require('./plain')
  require('./secure')
  require('./secure-with-fallback')
  require('./unknown-http-method')
  require('./missing-http2-module')
  require('./closing')
} else {
  tap.pass('Skip because Node version < 8.8')
  tap.end()
}
