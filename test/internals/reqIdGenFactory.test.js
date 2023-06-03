'use strict'

const { test } = require('tap')
const reqIdGenFactory = require('../../lib/reqIdGenFactory')

test('should create incremental ids deterministically', t => {
  t.plan(9999)
  const reqIdGen = reqIdGenFactory()

  for (let i = 1; i < 1e4; ++i) {
    t.equal(reqIdGen(), 'req-' + i.toString(36))
  }
})

test('should have prefix "req-"', t => {
  t.plan(1)
  const reqIdGen = reqIdGenFactory()

  t.ok(reqIdGen().startsWith('req-'))
})

test('different id generator functions should have separate internal counters', t => {
  t.plan(5)
  const reqIdGenA = reqIdGenFactory()
  const reqIdGenB = reqIdGenFactory()

  t.equal(reqIdGenA(), 'req-1')
  t.equal(reqIdGenA(), 'req-2')
  t.equal(reqIdGenB(), 'req-1')
  t.equal(reqIdGenA(), 'req-3')
  t.equal(reqIdGenB(), 'req-2')
})

test('should start counting with 1', t => {
  t.plan(1)
  const reqIdGen = reqIdGenFactory()

  t.equal(reqIdGen(), 'req-1')
})
