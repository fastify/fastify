'use strict'

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
  t.plan(1)
  const instance = {}
  try {
    decorator.dependencies(instance, ['test'])
    t.fail()
  } catch (e) {
    t.is(e.message, 'Fastify decorator: missing dependency: \'test\'.')
  }
})

test('decorate should internally call checkDependencies', t => {
  t.plan(1)
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
    t.is(e.message, 'Fastify decorator: missing dependency: \'test\'.')
  }
})
