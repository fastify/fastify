import { StandaloneValidator } from '@fastify/ajv-compiler'
import { StandaloneSerializer } from '@fastify/fast-json-stringify-compiler'
import { Ajv } from 'ajv'
import { expect } from 'tstyche'
import fastify, { type FastifyInstance, type FastifySchema } from '../../fastify.js'

const server = fastify()

expect(server.get(
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
)).type.toBeAssignableTo<FastifyInstance>()

expect(server.post(
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
)).type.toBeAssignableTo<FastifyInstance>()

expect(server.get(
  '/empty-schema',
  {
    schema: {}
  },
  () => { }
)).type.toBeAssignableTo<FastifyInstance>()

expect(server.get(
  '/no-schema',
  {},
  () => { }
)).type.toBeAssignableTo<FastifyInstance>()

expect(server.setValidatorCompiler(({ schema }) => {
  return new Ajv().compile(schema)
})).type.toBeAssignableTo<FastifyInstance>()

expect(server.setSerializerCompiler(() => {
  return data => JSON.stringify(data)
})).type.toBeAssignableTo<FastifyInstance>()

expect(server.post('/test', {
  validatorCompiler: ({ schema }) => {
    return data => {
      if (!data || data.constructor !== Object) {
        return { error: new Error('value is not an object') }
      }
      return { value: data }
    }
  }
}, async req => req.body)).type.toBeAssignableTo<FastifyInstance>()

expect(server.post('/test', {
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
}, async req => req.body)).type.toBeAssignableTo<FastifyInstance>()

expect(server.setValidatorCompiler<FastifySchema & { validate: Record<string, unknown> }>(
  function ({ schema }) {
    return new Ajv().compile(schema)
  }
)).type.toBeAssignableTo<FastifyInstance>()

expect(server.setSerializerCompiler<FastifySchema & { validate: string }>(
  () => data => JSON.stringify(data)
)).type.toBeAssignableTo<FastifyInstance>()

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
