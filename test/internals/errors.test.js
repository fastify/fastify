'use strict'

const t = require('tap')
const test = t.test
const { createError } = require('../../lib/errors')

test('Create error', t => {
  t.plan(4)
  const NewError = createError('CODE')
  const err = new NewError('hey %s', 'dude')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'hey dude')
  t.equal(err.code, 'CODE')
})

test('Create error with different base', t => {
  t.plan(5)
  const NewError = createError('CODE', TypeError)
  const err = new NewError('hey %s', 'dude')
  t.type(err, Error)
  t.type(err, TypeError)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'hey dude')
  t.equal(err.code, 'CODE')
})
