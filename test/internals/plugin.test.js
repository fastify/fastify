'use strict'

const t = require('tap')
const test = t.test

const pluginUtilsPublic = require('../../lib/pluginUtils.js')
const pluginUtils = require('../../lib/pluginUtils')[Symbol.for('internals')]
const symbols = require('../../lib/symbols.js')

test(`shouldSkipOverride should check the 'skip-override' symbol`, t => {
  t.plan(2)

  yes[Symbol.for('skip-override')] = true

  t.true(pluginUtils.shouldSkipOverride(yes))
  t.false(pluginUtils.shouldSkipOverride(no))

  function yes () {}
  function no () {}
})

test(`getMeta should return the object stored with the 'plugin-meta' symbol`, t => {
  t.plan(1)

  const meta = { hello: 'world' }
  fn[Symbol.for('plugin-meta')] = meta

  t.deepEqual(meta, pluginUtils.getMeta(fn))

  function fn () {}
})

test('checkDecorators should check if the given decorator is present in the instance', t => {
  t.plan(1)

  fn[Symbol.for('plugin-meta')] = {
    decorators: {
      fastify: ['plugin'],
      reply: ['plugin'],
      request: ['plugin']
    }
  }

  function context () {}
  context.plugin = true
  context[symbols.kReply] = { prototype: { plugin: true } }
  context[symbols.kRequest] = { prototype: { plugin: true } }

  try {
    pluginUtils.checkDecorators.call(context, fn)
    t.pass('Everything ok')
  } catch (err) {
    t.fail(err)
  }

  function fn () {}
})

test('checkDecorators should check if the given decorator is present in the instance (errored)', t => {
  t.plan(1)

  fn[Symbol.for('plugin-meta')] = {
    decorators: {
      fastify: ['plugin'],
      reply: ['plugin'],
      request: ['plugin']
    }
  }

  function context () {}
  context.plugin = true
  context[symbols.kReply] = { prototype: { plugin: true } }
  context[symbols.kRequest] = { prototype: {} }

  try {
    pluginUtils.checkDecorators.call(context, fn)
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, `The decorator 'plugin' is not present in Request`)
  }

  function fn () {}
})

test('checkDependencies should check if the given dependency is present in the instance', t => {
  t.plan(1)

  fn[Symbol.for('plugin-meta')] = {
    dependencies: ['plugin']
  }

  function context () {}
  context[pluginUtilsPublic.registeredPlugins] = ['plugin']

  try {
    pluginUtils.checkDependencies.call(context, fn)
    t.pass('Everything ok')
  } catch (err) {
    t.fail(err)
  }

  function fn () {}
})

test('checkDependencies should check if the given dependency is present in the instance (errored)', t => {
  t.plan(1)

  fn[Symbol.for('plugin-meta')] = {
    name: 'test-plugin',
    dependencies: ['plugin']
  }

  function context () {}
  context[pluginUtilsPublic.registeredPlugins] = []

  try {
    pluginUtils.checkDependencies.call(context, fn)
    t.fail('should throw')
  } catch (err) {
    t.is(err.message, `The dependency 'plugin' of plugin 'test-plugin' is not registered`)
  }

  function fn () {}
})
