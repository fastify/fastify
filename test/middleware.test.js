'use strict'

const { test } = require('tap')
const Fastify = require('..')
const {
  FST_ERR_DEC_ALREADY_PRESENT,
  FST_ERR_MISSING_MIDDLEWARE
} = require('../lib/errors')

test('Should throw if the basic use API has not been overridden', t => {
  t.plan(1)
  const fastify = Fastify()

  try {
    fastify.use()
    t.fail('Should throw')
  } catch (err) {
    t.ok(err instanceof FST_ERR_MISSING_MIDDLEWARE)
  }
})

test('Should be able to override the default use API', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.decorate('use', () => true)
  t.strictEqual(fastify.use(), true)
})

test('Cannot decorate use twice', t => {
  t.plan(1)
  const fastify = Fastify()
  fastify.decorate('use', () => true)
  try {
    fastify.decorate('use', () => true)
  } catch (err) {
    t.ok(err instanceof FST_ERR_DEC_ALREADY_PRESENT)
  }
})

test('Encapsulation works', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register((instance, opts, next) => {
    instance.decorate('use', () => true)
    t.strictEqual(instance.use(), true)
    next()
  })

  fastify.register((instance, opts, next) => {
    try {
      instance.use()
      t.fail('Should throw')
    } catch (err) {
      t.ok(err instanceof FST_ERR_MISSING_MIDDLEWARE)
    }
    next()
  })

  fastify.ready()
})
