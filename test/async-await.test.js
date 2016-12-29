'use strict'

const path = require('path')
const childProcess = require('child_process')
const tap = require('tap')

if (Number(process.versions.node[0]) >= 7) {
  childProcess.fork(path.join(__dirname, 'async-await'), [], {
    execArgv: ['--harmony-async-await']
  })
} else {
  tap.pass('Skip because Node version < 7')
  tap.end()
}
