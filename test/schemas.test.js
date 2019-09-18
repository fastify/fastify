'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

const AJV = require('ajv')

const schemaUsed = {
  $id: 'urn:schema:foo',
  definitions: {
    foo: { type: 'string' }
  },

  type: 'object',
  properties: {
    foo: { $ref: '#/definitions/foo' }
  }
}
const schemaParent = {
  $id: 'urn:schema:response',
  type: 'object',
  properties: {
    foo: { $ref: 'urn:schema:foo#/definitions/foo' }
  }
}

test('Should use the ref resolver', t => {
  t.plan(2)
  const fastify = Fastify()
  const ajv = new AJV()

  ajv.addSchema(schemaParent)
  ajv.addSchema(schemaUsed)

  fastify.setSchemaResolver((ref) => {
    t.equals(ref, 'urn:schema:foo')
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      response: {
        '2xx': ajv.getSchema('urn:schema:response').schema
      }
    },
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.ready(t.error)
})
