'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

test('server methods should exist', t => {
  t.plan(2)
  const fastify = Fastify()
  t.ok(fastify.decorate)
  t.ok(fastify.hasDecorator)
})

test('server methods should be incapsulated via .register', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', () => {})
    t.ok(instance.test)
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.test)
  })
})

test('hasServerMethod should check if the given method already exist', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('test', () => {})
    t.ok(instance.hasDecorator('test'))
    next()
  })

  fastify.ready(() => {
    t.notOk(fastify.hasDecorator('test'))
  })
})

test('addServerMethod should throw if a declared dependency is not present', t => {
  t.plan(1)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    try {
      instance.decorate('test', () => {}, ['dependency'])
      t.fail()
    } catch (e) {
      t.is(e.message, 'Fastify decorator: missing dependency: \'dependency\'.')
    }
  })
})
