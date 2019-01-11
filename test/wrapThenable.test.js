'use strict'

const t = require('tap')
const test = t.test
const { kReplySentOverwritten } = require('../lib/symbols')
const wrapThenable = require('../lib/wrapThenable')

test('should resolve immediately when reply.sentOverwritten is true', t => {
  t.plan(1)
  const reply = {}
  reply[kReplySentOverwritten] = true
  const thenable = Promise.resolve()
  wrapThenable(thenable, reply)
  t.pass()
})

test('should reject immediately when reply.sentOverwritten is true', t => {
  t.plan(1)
  const reply = { res: {} }
  reply[kReplySentOverwritten] = true
  reply.res.log = {
    error: () => { }
  }

  const thenable = Promise.reject(new Error('Reply sent already'))
  wrapThenable(thenable, reply)
  t.pass()
})
