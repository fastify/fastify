'use strict'

const t = require('tap')

if (Number(process.versions.node[0]) >= 7) {
  const v8 = require('v8')
  v8.setFlagsFromString('--harmony_async_await')
  require('./async-await.js')(t)
} else {
  t.pass('Skip because Node version < 7')
}
