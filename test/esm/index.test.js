'use strict'

const t = require('tap')
const semver = require('semver')

if (semver.lt(process.versions.node, '13.3.0')) {
  t.skip('Skip esm because Node version <= 13.3.0')
} else {
  // Node v8 throw a `SyntaxError: Unexpected token import`
  // even if this branch is never touch in the code,
  // by using `eval` we can avoid this issue.
  // eslint-disable-next-line
  new Function('module', 'return import(module)')('./esm.mjs').catch((err) => {
    process.nextTick(() => {
      throw err
    })
  })
}

if (semver.lt(process.versions.node, '14.13.0')) {
  t.skip('Skip named exports because Node version < 14.13.0')
} else {
  // Node v8 throw a `SyntaxError: Unexpected token import`
  // even if this branch is never touch in the code,
  // by using `eval` we can avoid this issue.
  // eslint-disable-next-line
  new Function('module', 'return import(module)')('./named-exports.mjs').catch((err) => {
    process.nextTick(() => {
      throw err
    })
  })
}
