'use strict'

const t = require('tap')
const test = t.test
const { createError } = require('../../lib/errors')

test('Create error with zero parameter', t => {
  t.plan(6)
  const NewError = createError('CODE', 'Not available')
  const err = new NewError()
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'CODE: Not available')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})

test('Create error with 1 parameter', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s')
  const err = new NewError('alice')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'CODE: hey alice')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})

test('Create error with 2 parameters', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s, I like your %s')
  const err = new NewError('alice', 'attitude')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'CODE: hey alice, I like your attitude')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})

test('Create error with 3 parameters', t => {
  t.plan(6)
  const NewError = createError('CODE', 'hey %s, I like your %s %s')
  const err = new NewError('alice', 'attitude', 'see you')
  t.type(err, Error)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'CODE: hey alice, I like your attitude see you')
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
  t.equal(err.message, 'CODE: hey dude')
  t.equal(err.code, 'CODE')
  t.notOk(err.statusCode)
  t.ok(err.stack)
})

test('Should throw when error code has no fastify code', t => {
  t.plan(1)
  try {
    createError()
  } catch (err) {
    t.equal(err.message, 'Fastify error code must not be empty')
  }
})

test('Should throw when error code has no message', t => {
  t.plan(1)
  try {
    createError('code')
  } catch (err) {
    t.equal(err.message, `Fastify error message must not be empty`)
  }
})

test('Create error with different base', t => {
  t.plan(7)
  const NewError = createError('CODE', 'hey %s', 500, TypeError)
  const err = new NewError('dude')
  t.type(err, Error)
  t.type(err, TypeError)
  t.equal(err.name, 'FastifyError [CODE]')
  t.equal(err.message, 'CODE: hey dude')
  t.equal(err.code, 'CODE')
  t.equal(err.statusCode, 500)
  t.ok(err.stack)
})
