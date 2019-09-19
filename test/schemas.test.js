'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('..')

const AJV = require('ajv')
const fastClone = require('rfdc')({ circles: false, proto: true })

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

test('Should use the ref resolver - response', t => {
  t.plan(2)
  const fastify = Fastify()
  const ajv = new AJV()

  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))

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

test('Should use the ref resolver - body', t => {
  t.plan(3)
  const fastify = Fastify()
  const ajv = new AJV()

  ajv.addSchema(fastClone(schemaParent))
  ajv.addSchema(fastClone(schemaUsed))

  fastify.setSchemaCompiler(schema => ajv.compile(schema))

  fastify.setSchemaResolver((ref) => {
    t.equals(ref, 'urn:schema:foo')
    return ajv.getSchema(ref).schema
  })

  fastify.route({
    method: 'POST',
    url: '/',
    schema: {
      body: ajv.getSchema('urn:schema:response').schema
    },
    handler (req, reply) {
      reply.send({ foo: 'bar' })
    }
  })

  fastify.inject({
    method: 'POST',
    url: '/',
    payload: { foo: 'bar' }
  }, (err, res) => {
    t.error(err)
    t.deepEquals(JSON.parse(res.payload), { foo: 'bar' })
  })
})
