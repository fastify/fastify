'use strict'

const t = require('tap')
const test = t.test
const { kReplySentOverwritten } = require('../lib/symbols')
const wrapThenable = require('../lib/wrapThenable')

test('should resolve immediately when reply[kReplySentOverwritten] is true', t => {
  const reply = {}
  reply[kReplySentOverwritten] = true
  const thenable = Promise.resolve()
  wrapThenable(thenable, reply)
  t.end()
})

test('should reject immediately when reply[kReplySentOverwritten] is true', t => {
  t.plan(1)
  const reply = { res: {} }
  reply[kReplySentOverwritten] = true
  reply.log = {
    error: ({ err }) => {
      t.equal(err.message, 'Reply sent already')
    }
  }

  const thenable = Promise.reject(new Error('Reply sent already'))
  wrapThenable(thenable, reply)
})
