'use strict'

const t = require('tap')
const test = t.test

test('should import as default', t => {
  t.plan(2)
  const fastify = require('..')
  t.ok(fastify)
  t.equal(typeof fastify, 'function')
})

test('should import as esm', t => {
  t.plan(2)
  const { fastify } = require('..')
  t.ok(fastify)
  t.equal(typeof fastify, 'function')
})

test('should contain errors property', t => {
  t.plan(3)
  const fastify = require('..')
  t.ok(fastify.errors)
  t.ok(typeof fastify.errors === 'object')
  t.ok(fastify.errors.FST_ERR_NOT_FOUND instanceof Function)
})

test('should import errors as esm', t => {
  t.plan(3)
  const { errors } = require('..')
  t.ok(errors)
  t.ok(typeof errors === 'object')
  t.ok(errors.FST_ERR_NOT_FOUND instanceof Function)
})
