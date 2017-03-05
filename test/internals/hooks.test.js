'use strict'

const t = require('tap')
const test = t.test

const hooksManager = require('../../lib/hooks')
const hooks = hooksManager()
const otherHooks = hooksManager()
const noop = () => {}

test('hooks should store an object with the hooks and .get shoudl return it', t => {
  t.plan(2)
  const h = hooks.get()
  t.ok(Array.isArray(h.preMiddleware))
  t.ok(Array.isArray(h.preRouting))
})

test('hooks.add should add an hook to the given hook', t => {
  t.plan(4)
  hooks.add({
    preMiddleware: noop
  })
  t.is(hooks.get.preMiddleware().length, 1)
  t.is(typeof hooks.get.preMiddleware()[0], 'function')

  hooks.add({
    postMiddleware: noop
  })
  t.is(hooks.get.postMiddleware().length, 1)
  t.is(typeof hooks.get.postMiddleware()[0], 'function')
})

test('hooks.add can accept an array of functions', t => {
  t.plan(4)
  hooks.add([{
    preMiddleware: noop
  }, {
    postMiddleware: noop
  }])

  t.is(hooks.get.preMiddleware().length, 2)
  t.is(typeof hooks.get.preMiddleware()[1], 'function')
  t.is(hooks.get.postMiddleware().length, 2)
  t.is(typeof hooks.get.postMiddleware()[1], 'function')
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

test('different instances does not affect each other', t => {
  t.plan(1)
  hooks.add({
    preMiddleware: noop
  })

  t.is(otherHooks.get.preMiddleware.length, 0)
})

test('hooks aliases', t => {
  t.plan(5)
  otherHooks.add([{
    preMiddleware: noop
  }, {
    postMiddleware: noop
  }, {
    preRouting: noop
  }, {
    postRouting: noop
  }, {
    preParsing: noop
  }, {
    postParsing: noop
  }, {
    preValidation: noop
  }, {
    postValidation: noop
  }, {
    preHandler: noop
  }])

  t.is(otherHooks.get.preMiddleware().length, 1)
  t.is(otherHooks.get.preRouting().length, 2)
  t.is(otherHooks.get.preParsing().length, 2)
  t.is(otherHooks.get.preValidation().length, 2)
  t.is(otherHooks.get.preHandler().length, 2)
})
