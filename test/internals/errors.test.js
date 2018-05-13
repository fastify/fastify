'use strict'

const t = require('tap')
const test = t.test
const { createError } = require('../../lib/errors')

test('Create error', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s')
  const err = new NewError('dude')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'Code: CODE; hey dude')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})

test('Create error with no statusCode property', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s', 0)
  const err = new NewError('dude')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'Code: CODE; hey dude')
  t.equal(err.code, 'CODE')
  t.notOk(err.statusCode)
  t.ok(err.stack)
})

test('Create error with different base', t => {
  t.plan(7)
  const NewError = createError('CODE', 'hey %s', 500, TypeError)
  const err = new NewError('dude')
  t.type(err, Error)
  t.type(err, TypeError)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'Code: CODE; hey dude')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})
