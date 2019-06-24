'use strict'

const Fastify = require('..')
const S = require('fluent-schema')

function fluentSchemaTest (t) {
  const test = t.test

  test('fluent-schema generate a valid JSON Schema in "$ref-way"', t => {
    t.plan(1)

    const fastify = new Fastify()

    const addressSchema = S.object()
      .id('#address')
      .prop('line1').required()
      .prop('line2')
      .prop('country').required()
      .prop('city').required()
      .prop('zipcode').required()
      .valueOf()

    const commonSchemas = S.object()
      .id('https://fastify/demo')
      .definition('addressSchema', addressSchema)
      .valueOf()

    fastify.addSchema(commonSchemas)

    const bodyJsonSchema = S.object()
      .prop('residence', S.ref('https://fastify/demo#address')).required()
      .prop('office', S.ref('https://fastify/demo#/definitions/addressSchema')).required()
      .valueOf()

    const schema = { body: bodyJsonSchema }
    fastify.post('/the/url', { schema }, () => { })

    fastify.ready(t.error)
  })

  test('fluent-schema generate a valid JSON Schema in "replace-way"', t => {
    t.plan(1)

    const fastify = new Fastify()

    const sharedAddressSchema = {
      $id: 'sharedAddress',
      type: 'object',
      required: ['line1', 'country', 'city', 'zipcode'],
      properties: {
        line1: { type: 'string' },
        line2: { type: 'string' },
        country: { type: 'string' },
        city: { type: 'string' },
        zipcode: { type: 'string' }
      }
    }

    fastify.addSchema(sharedAddressSchema)

    const bodyJsonSchema = {
      type: 'object',
      properties: {
        vacation: 'sharedAddress#'
      }
    }
    const schema = { body: bodyJsonSchema }

    fastify.post('/the/url', { schema }, () => { })

    fastify.ready(t.error)
  })

  test('fluent-schema mix-up of "$ref-way" and "replace-way"', t => {
    t.plan(1)

    const fastify = new Fastify()

    const addressSchema = S.object()
      .id('#address')
      .prop('line1').required()
      .prop('line2')
      .prop('country').required()
      .prop('city').required()
      .prop('zipcode').required()
      .valueOf()

    const commonSchemas = S.object()
      .id('https://fastify/demo')
      .definition('addressSchema', addressSchema)
      .valueOf()

    const sharedAddressSchema = {
      $id: 'sharedAddress',
      type: 'object',
      required: ['line1', 'country', 'city', 'zipcode'],
      properties: {
        line1: { type: 'string' },
        line2: { type: 'string' },
        country: { type: 'string' },
        city: { type: 'string' },
        zipcode: { type: 'string' }
      }
    }

    fastify.addSchema(commonSchemas)
    fastify.addSchema(sharedAddressSchema)

    const bodyJsonSchema = S.object()
      .prop('residence', S.ref('https://fastify/demo#address')).required()
      .prop('office', S.ref('https://fastify/demo#/definitions/addressSchema')).required()
      .valueOf()

    // add the key with the string value to use shared schema in "replace-way"
    bodyJsonSchema.properties.vacation = 'sharedAddress#'

    const schema = { body: bodyJsonSchema }

    fastify.post('/the/url', { schema }, () => { })

    fastify.ready(t.error)
  })

  test('Should call valueOf internally', t => {
    t.plan(1)

    const fastify = new Fastify()

    const addressSchema = S.object()
      .id('#address')
      .prop('line1').required()
      .prop('line2')
      .prop('country').required()
      .prop('city').required()
      .prop('zipcode').required()

    const commonSchemas = S.object()
      .id('https://fastify/demo')
      .definition('addressSchema', addressSchema)

    fastify.addSchema(commonSchemas)

    fastify.route({
      method: 'POST',
      url: '/query',
      handler: () => {},
      schema: {
        query: S.object().prop('hello', S.string()).required(),
        body: S.object().prop('hello', S.string()).required(),
        params: S.object().prop('hello', S.string()).required(),
        headers: S.object().prop('hello', S.string()).required(),
        response: {
          200: S.object().prop('hello', S.string()).required(),
          201: S.object().prop('hello', S.string()).required()
        }
      }
    })

    fastify.route({
      method: 'POST',
      url: '/querystring',
      handler: () => {},
      schema: {
        querystring: S.object().prop('hello', S.string()).required(),
        body: S.object().prop('hello', S.string()).required(),
        params: S.object().prop('hello', S.string()).required(),
        headers: S.object().prop('hello', S.string()).required(),
        response: {
          200: S.object().prop('hello', S.string()).required(),
          201: S.object().prop('hello', S.string()).required()
        }
      }
    })

    fastify.ready(t.error)
  })
}

module.exports = fluentSchemaTest
