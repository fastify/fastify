'use strict'

const t = require('tap')
const test = t.test
const serverMethods = require('../../lib/serverMethods')

test('addServerMethod should add the given method to its instance', t => {
  t.plan(1)
  function build () {
    server.add = serverMethods.add
    return server
    function server () {}
  }

  const server = build()
  server.add('test', () => {})
  t.ok(server.test)
})

test('addServerMethod is chainable', t => {
  t.plan(3)
  function build () {
    server.add = serverMethods.add
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
  t.ok(serverMethods.exist(instance, 'test'))
})

test('checkExistence should find the instance if not given', t => {
  t.plan(1)
  function build () {
    server.add = serverMethods.add
    server.check = serverMethods.exist
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
  t.ok(serverMethods.exist(instance, 'test'))
})

test('checkDependencies should throw if a dependency is not present', t => {
  t.plan(1)
  const instance = {}
  try {
    serverMethods.dependencies(instance, ['test'])
    t.fail()
  } catch (e) {
    t.is(e.message, 'Fastify plugin: missing dependency: \'test\'.')
  }
})

test('addServerMethod should internally call checkDependencies', t => {
  t.plan(1)
  function build () {
    server.add = serverMethods.add
    return server
    function server () {}
  }

  const server = build()

  try {
    server.add('method', () => {}, ['test'])
    t.fail()
  } catch (e) {
    t.is(e.message, 'Fastify plugin: missing dependency: \'test\'.')
  }
})
