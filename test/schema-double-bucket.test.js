'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const Fastify = require('..')

test('Double schema bucket - schema available for both', t => {
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'urn:schema:both',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  assert.ok(fastify.getValidatorSchemas()['urn:schema:both'])
  assert.ok(fastify.getSerializerSchemas()['urn:schema:both'])
})

test('Double schema bucket - schema available for validator only', t => {
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'urn:schema:validator',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }, { validator: true })

  assert.ok(fastify.getValidatorSchemas()['urn:schema:validator'])
  assert.equal(fastify.getSerializerSchemas()['urn:schema:validator'], undefined)
})

test('Double schema bucket - schema available for serializer only', t => {
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'urn:schema:serializer',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }, { serializer: true })

  assert.equal(fastify.getValidatorSchemas()['urn:schema:serializer'], undefined)
  assert.ok(fastify.getSerializerSchemas()['urn:schema:serializer'])
})

test('Double schema bucket - getSchemas returns merged schema', t => {
  const fastify = Fastify()

  fastify.addSchema({
    $id: 'urn:schema:serializer',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }, { serializer: true })

  fastify.addSchema({
    $id: 'urn:schema:validator',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }, { validator: true })

  const schemas = fastify.getSchemas()
  assert.ok(schemas['urn:schema:validator'])
  assert.ok(schemas['urn:schema:serializer'])
})
