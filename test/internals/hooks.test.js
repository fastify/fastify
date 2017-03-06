'use strict'

const t = require('tap')
const test = t.test

const hooksManager = require('../../lib/hooks')
const hooks = hooksManager()
const otherHooks = hooksManager()
const noop = () => {}

test('hooks should store an object with the hooks and .get should return it', t => {
  t.plan(4)
  const h = hooks.get()
  t.is(typeof h, 'object')
  t.ok(Array.isArray(h.onRequest))
  t.ok(Array.isArray(h.preRouting))
  t.ok(Array.isArray(h.preHandler))
})

test('hooks.add should add an hook to the given hook', t => {
  t.plan(6)
  hooks.add('onRequest', noop)
  t.is(hooks.get.onRequest().length, 1)
  t.is(typeof hooks.get.onRequest()[0], 'function')

  hooks.add('preRouting', noop)
  t.is(hooks.get.preRouting().length, 1)
  t.is(typeof hooks.get.preRouting()[0], 'function')

  hooks.add('preHandler', noop)
  t.is(hooks.get.preHandler().length, 1)
  t.is(typeof hooks.get.preHandler()[0], 'function')
})

test('hooks should throw on unexisting handler', t => {
  t.plan(1)
  try {
    hooks.add('onUnexistingHook', noop)
    t.fail()
  } catch (e) {
    t.pass()
  }
})

test('different instances does not affect each other', t => {
  t.plan(1)
  hooks.add('onRequest', noop)

  t.is(otherHooks.get.onRequest.length, 0)
})

test('should throw on wrong parameters', t => {
  t.plan(2)
  try {
    hooks.add(null, noop)
    t.fail()
  } catch (e) {
    t.is(e.message, 'The hook name must be a string')
  }

  try {
    hooks.add('', null)
    t.fail()
  } catch (e) {
    t.is(e.message, 'The hook callback must be a function')
  }
})
