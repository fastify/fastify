'use strict'

const t = require('tap')
const test = t.test
const { kReplyHijacked } = require('../lib/symbols')
const wrapThenable = require('../lib/wrapThenable')
const Reply = require('../lib/reply')

test('should resolve immediately when reply[kReplyHijacked] is true', t => {
  const reply = {}
  reply[kReplyHijacked] = true
  const thenable = Promise.resolve()
  wrapThenable(thenable, reply)
  t.end()
})

test('should reject immediately when reply[kReplyHijacked] is true', t => {
  t.plan(1)
  const reply = new Reply({}, {}, {})
  reply[kReplyHijacked] = true
  reply.log = {
    error: ({ err }) => {
      t.equal(err.message, 'Reply sent already')
    }
  }

  const thenable = Promise.reject(new Error('Reply sent already'))
  wrapThenable(thenable, reply)
})
