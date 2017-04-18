'use strict'

const t = require('tap')
const test = t.test

const validation = require('../../lib/validation')
const symbols = require('../../lib/validation').symbols

test('Symbols', t => {
  t.plan(4)
  t.is(typeof symbols.outputSchema, 'symbol')
  t.is(typeof symbols.bodySchema, 'symbol')
  t.is(typeof symbols.querystringSchema, 'symbol')
  t.is(typeof symbols.paramsSchema, 'symbol')
})

test('build schema - missing schema', t => {
  t.plan(1)
  const opts = {}
  validation.build(opts)
  t.is(typeof opts[symbols.outputSchema], 'function')
})

test('build schema - missing output schema', t => {
  t.plan(1)
  const opts = { schema: {} }
  validation.build(opts)
  t.is(typeof opts[symbols.outputSchema], 'function')
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
  t.is(typeof opts[symbols.outputSchema], 'function')
})

test('build schema - payload schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
  validation.build(opts)
  t.is(typeof opts[symbols.bodySchema], 'function')
})

test('build schema - querystring schema', t => {
  t.plan(2)
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
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.is(typeof opts[symbols.querystringSchema], 'function')
})

test('build schema - querystring schema abbreviated', t => {
  t.plan(2)
  const opts = {
    schema: {
      querystring: {
        hello: { type: 'string' }
      }
    }
  }
  validation.build(opts)
  t.type(opts[symbols.querystringSchema].schema.type, 'string')
  t.is(typeof opts[symbols.querystringSchema], 'function')
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
  t.is(typeof opts[symbols.paramsSchema], 'function')
})
