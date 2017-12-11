'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('../fastify')

test('fastify can add schemas and get cached schemas + stringifiers out', t => {
  t.plan(6)
  const fastify = Fastify()

  fastify.addSchema({
    id: 'defs.json',
    definitions: {
      ref: {
        type: 'object',
        properties: {
          str: { type: 'string' }
        }
      }
    }
  })

  const validate = fastify.getSchema('defs.json#/definitions/ref')
  const stringify = fastify.getStringify('defs.json#/definitions/ref')

  t.is(typeof validate, 'function')
  t.is(typeof stringify, 'function')

  const valid = validate({
    str: 'test'
  })

  const payload = stringify({
    str: 'test'
  })

  t.ok(valid)
  t.is(payload, '{"str":"test"}')

  const cachedValidate = fastify.getSchema('defs.json#/definitions/ref')
  const cachedStringify = fastify.getStringify('defs.json#/definitions/ref')

  t.ok(validate === cachedValidate)
  t.ok(stringify === cachedStringify)
})

test('fastify schema shorthand uses correct schema', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.addSchema({
    id: 'defs.json',
    definitions: {
      ref: {
        type: 'object',
        properties: {
          str: { type: 'string' }
        }
      }
    }
  })

  const valid = fastify.validate('defs.json#/definitions/ref', {
    str: 'test'
  })

  const payload = fastify.stringify('defs.json#/definitions/ref', {
    str: 'test'
  })

  t.ok(valid)
  t.is(payload, '{"str":"test"}')
})

test('fastify uses custom schemaResolver with cached results', t => {
  t.plan(4)
  const fastify = Fastify()

  const validator = function () {
    return true
  }

  fastify.setSchemaResolver(function (keyRef, allSchemas) {
    t.is(keyRef, 'reference')
    t.deepEqual(allSchemas, { 'reference': { test: 'abcdef' } })
    return validator
  })

  fastify.addSchema({ test: 'abcdef' }, 'reference')

  const validate = fastify.getSchema('reference')
  t.is(validate, validator)
  t.is(validate, fastify.getSchema('reference'))
})
