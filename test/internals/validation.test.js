'use strict'

const t = require('tap')
const test = t.test

const Ajv = require('ajv')
const ajv = new Ajv({ coerceTypes: true })

const validation = require('../../lib/validation')
const Schemas = require('../../lib/schemas')
const symbols = require('../../lib/validation').symbols

test('Symbols', t => {
  t.plan(5)
  t.is(typeof symbols.responseSchema, 'symbol')
  t.is(typeof symbols.bodySchema, 'symbol')
  t.is(typeof symbols.querystringSchema, 'symbol')
  t.is(typeof symbols.paramsSchema, 'symbol')
  t.is(typeof symbols.headersSchema, 'symbol')
})

test('build schema - missing schema', t => {
  t.plan(1)
  const opts = {}
  validation.build(opts)
  t.is(typeof opts[symbols.responseSchema], 'undefined')
})

test('build schema - missing output schema', t => {
  t.plan(1)
  const opts = { schema: {} }
  validation.build(opts, null, new Schemas())
  t.is(typeof opts[symbols.responseSchema], 'undefined')
})

test('build schema - output schema', t => {
  t.plan(2)
  const opts = {
    schema: {
      response: {
        '2xx': {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        },
        201: {
          type: 'object',
          properties: {
            hello: { type: 'number' }
          }
        }
      }
    }
  }
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
  t.is(typeof opts[symbols.responseSchema]['2xx'], 'function')
  t.is(typeof opts[symbols.responseSchema]['201'], 'function')
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
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
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
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
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
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
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
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
  t.is(typeof opts[symbols.paramsSchema], 'function')
})

test('build schema - headers schema', t => {
  t.plan(1)
  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'content-type': { type: 'string' }
        }
      }
    }
  }
  validation.build(opts, schema => ajv.compile(schema), new Schemas())
  t.is(typeof opts[symbols.headersSchema], 'function')
})
