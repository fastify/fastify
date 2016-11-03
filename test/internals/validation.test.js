'use strict'

const t = require('tap')
const test = t.test

const validation = require('../../lib/validation')
const internals = require('../../lib/validation')._internals

test('Symbols', t => {
  t.plan(4)
  t.is(typeof internals.outputSchema, 'symbol')
  t.is(typeof internals.payloadSchema, 'symbol')
  t.is(typeof internals.querystringSchema, 'symbol')
  t.is(typeof internals.paramsSchema, 'symbol')
})

test('build schema - missing schema', t => {
  t.plan(1)
  const opts = {}
  validation.build(opts)
  t.is(typeof opts[internals.outputSchema], 'function')
})

test('build schema - missing output schema', t => {
  t.plan(1)
  const opts = { schema: {} }
  validation.build(opts)
  t.is(typeof opts[internals.outputSchema], 'function')
})

test('build schema - output schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      out: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.build(opts)
  t.is(typeof opts[internals.outputSchema], 'function')
})

test('build schema - payload schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      payload: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.build(opts)
  t.is(typeof opts[internals.payloadSchema], 'function')
})

test('build schema - querystring schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.build(opts)
  t.is(typeof opts[internals.querystringSchema], 'function')
})

test('build schema - params schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      params: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.build(opts)
  t.is(typeof opts[internals.paramsSchema], 'function')
})
