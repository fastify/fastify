import { StandaloneValidator } from '@fastify/ajv-compiler'
import { StandaloneSerializer } from '@fastify/fast-json-stringify-compiler'
import Ajv from 'ajv'
import { expectAssignable } from 'tsd'
import fastify, { FastifyInstance, FastifySchema } from '../../fastify'

const server = fastify()

expectAssignable<FastifyInstance>(server.get(
  '/full-schema',
  {
    schema: {
      body: { type: 'null' },
      querystring: { type: 'null' },
      params: { type: 'null' },
      headers: { type: 'null' },
      response: { type: 'null' }
    }
  },
  () => { }
))

expectAssignable<FastifyInstance>(server.post(
  '/multiple-content-schema',
  {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: { type: 'object' }
          },
          'text/plain': {
            schema: { type: 'string' }
          }
        }
      }
    }
  },
  () => { }
))

expectAssignable<FastifyInstance>(server.get(
  '/empty-schema',
  {
    schema: {}
  },
  () => { }
))

expectAssignable<FastifyInstance>(server.get(
  '/no-schema',
  {},
  () => { }
))

expectAssignable<FastifyInstance>(server.setValidatorCompiler(({ schema }) => {
  return new Ajv().compile(schema)
}))

expectAssignable<FastifyInstance>(server.setSerializerCompiler(() => {
  return data => JSON.stringify(data)
}))

expectAssignable<FastifyInstance>(server.post('/test', {
  validatorCompiler: ({ schema }) => {
    return data => {
      if (!data || data.constructor !== Object) {
        return { error: new Error('value is not an object') }
      }
      return { value: data }
    }
  }
}, async req => req.body))

expectAssignable<FastifyInstance>(server.post('/test', {
  validatorCompiler: ({ schema }) => {
    return data => {
      if (!data || data.constructor !== Object) {
        return {
          error: [
            {
              keyword: 'type',
              instancePath: '',
              schemaPath: '#/type',
              params: { type: 'object' },
              message: 'value is not an object'
            }
          ]
        }
      }
      return { value: data }
    }
  }
}, async req => req.body))

expectAssignable<FastifyInstance>(server.setValidatorCompiler<FastifySchema & { validate: Record<string, unknown> }>(
  function ({ schema }) {
    return new Ajv().compile(schema)
  }
))

expectAssignable<FastifyInstance>(server.setSerializerCompiler<FastifySchema & { validate: string }>(
  () => data => JSON.stringify(data)
))

// https://github.com/fastify/ajv-compiler/issues/95
{
  const factory = StandaloneValidator({
    readMode: false,
    storeFunction (routeOpts, schemaValidationCode) { }
  })

  fastify({
    schemaController: {
      compilersFactory: {
        buildValidator: factory
      }
    }
  })
}

{
  const factory = StandaloneSerializer({
    readMode: false,
    storeFunction (routeOpts, schemaValidationCode) { }
  })

  fastify({
    schemaController: {
      compilersFactory: {
        buildSerializer: factory
      }
    }
  })
}

// OpenAPI extension properties (x-*)
expectAssignable<FastifyInstance>(server.get(
  '/test',
  {
    schema: {
      'x-meta': 'hello'
    }
  },
  async () => {
    return { ok: true }
  }
))

expectAssignable<FastifyInstance>(server.get(
  '/example',
  {
    schema: {
      description: 'Example of this api call',
      'x-source-file': 'example.js',
      tags: ['example'],
      summary: 'Test API call get',
      response: {
        200: {
          description: 'Successful response',
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  },
  async () => {
    return { message: 'Hello' }
  }
))

expectAssignable<FastifyInstance>(server.post(
  '/test-multiple-extensions',
  {
    schema: {
      'x-custom-property': { nested: 'value' },
      'x-another-extension': ['item1', 'item2'],
      'x-source-file': 'test.js',
      body: { type: 'object' }
    }
  },
  async () => {
    return { success: true }
  }
))
