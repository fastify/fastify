'use strict'

const t = require('tap')
const test = t.test

const hooks = require('../../lib/hooks')
const noop = () => {}

test('hooks should store an object with the hooks and .get shoudl return it', t => {
  t.plan(2)
  const h = hooks.get()
  t.ok(Array.isArray(h.onRequest))
  t.ok(Array.isArray(h.onRequestRaw))
})

test('hooks.add should add an hook to the given hook', t => {
  t.plan(4)
  hooks.add({
    onRequest: noop
  })
  t.is(hooks.get.onRequest().length, 1)
  t.is(typeof hooks.get.onRequest()[0], 'function')

  hooks.add({
    onRequestRaw: noop
  })
  t.is(hooks.get.onRequestRaw().length, 1)
  t.is(typeof hooks.get.onRequestRaw()[0], 'function')
})

test('hooks.add can accept an array of functions', t => {
  t.plan(4)
  hooks.add([{
    onRequest: noop
  }, {
    onRequestRaw: noop
  }])

  t.is(hooks.get.onRequest().length, 2)
  t.is(typeof hooks.get.onRequest()[1], 'function')
  t.is(hooks.get.onRequestRaw().length, 2)
  t.is(typeof hooks.get.onRequestRaw()[1], 'function')
})

test('hooks should throw on unexisting handler', t => {
  t.plan(1)
  try {
    hooks.add({
      onUnexistingHook: noop
    })
    t.fail()
  } catch (e) {
    t.pass()
  }
})
