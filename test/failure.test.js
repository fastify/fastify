'use strict'

const { test } = require('tap')

test('failing test', () => {
  throw new Error('kaboom')
})
