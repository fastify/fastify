'use strict'

/* eslint no-prototype-builtins: 0 */

const t = require('tap')
const test = t.test
const decorator = require('../../lib/decorate')

test('decorate should add the given method to its instance', t => {
  t.plan(1)
  function build () {
    server.add = decorator.add
    return server
    function server () {}
  }

  const server = build()
  server.add('test', () => {})
  t.ok(server.test)
})

test('decorate is chainable', t => {
  t.plan(3)
  function build () {
    server.add = decorator.add
    return server
    function server () {}
  }

  const server = build()
  server
    .add('test1', () => {})
    .add('test2', () => {})
    .add('test3', () => {})

  t.ok(server.test1)
  t.ok(server.test2)
  t.ok(server.test3)
})

test('checkExistence should check if a property is part of the given instance', t => {
  t.plan(1)
  const instance = { test: () => {} }
  t.ok(decorator.exist(instance, 'test'))
})

test('checkExistence should find the instance if not given', t => {
  t.plan(1)
  function build () {
    server.add = decorator.add
    server.check = decorator.exist
    return server
    function server () {}
  }

  const server = build()
  server.add('test', () => {})
  t.ok(server.check('test'))
})

test('checkExistence should check the prototype as well', t => {
  t.plan(1)
  function Instance () {}
  Instance.prototype.test = () => {}

  const instance = new Instance()
  t.ok(decorator.exist(instance, 'test'))
})

test('checkDependencies should throw if a dependency is not present', t => {
  t.plan(2)
  const instance = {}
  try {
    decorator.dependencies(instance, ['test'])
    t.fail()
  } catch (e) {
    t.is(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
    t.is(e.message, 'FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency \'test\'.')
  }
})

test('decorate should internally call checkDependencies', t => {
  t.plan(2)
  function build () {
    server.add = decorator.add
    return server
    function server () {}
  }

  const server = build()

  try {
    server.add('method', () => {}, ['test'])
    t.fail()
  } catch (e) {
    t.is(e.code, 'FST_ERR_DEC_MISSING_DEPENDENCY')
    t.is(e.message, 'FST_ERR_DEC_MISSING_DEPENDENCY: The decorator is missing dependency \'test\'.')
  }
})

test('decorate should recognize getter/setter objects', t => {
  t.plan(6)

  const one = {}
  decorator.add.call(one, 'foo', {
    getter: () => this._a,
    setter: (val) => {
      t.pass()
      this._a = val
    }
  })
  t.is(one.hasOwnProperty('foo'), true)
  t.is(one.foo, undefined)
  one.foo = 'a'
  t.is(one.foo, 'a')

  // getter only
  const two = {}
  decorator.add.call(two, 'foo', {
    getter: () => 'a getter'
  })
  t.is(two.hasOwnProperty('foo'), true)
  t.is(two.foo, 'a getter')
})
