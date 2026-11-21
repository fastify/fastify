import { AjvCompiler, BuildCompilerFromPool, StandaloneValidator } from '@fastify/ajv-compiler'
import { StandaloneSerializer } from '@fastify/fast-json-stringify-compiler'
import Ajv from 'ajv'
import { expect } from 'tstyche'
import fastify, { FastifyInstance, FastifySchema } from '../../fastify.js'
import { FastifyOutputValidatorOptions } from '../../types/schema.js'

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
)).type.toBe<FastifyInstance>()

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
)).type.toBe<FastifyInstance>()

expect(server.get(
  '/empty-schema',
  {
    schema: {}
  },
  () => { }
)).type.toBe<FastifyInstance>()

expect(server.get(
  '/no-schema',
  {},
  () => { }
)).type.toBe<FastifyInstance>()

expect(server.setValidatorCompiler(({ schema }) => {
  return new Ajv().compile(schema)
})).type.toBe<FastifyInstance>()

expect(server.setSerializerCompiler(() => {
  return data => JSON.stringify(data)
})).type.toBe<FastifyInstance>()

expect(server.post('/test', {
  validatorCompiler: ({ schema }) => {
    return data => {
      if (!data || data.constructor !== Object) {
        return { error: new Error('value is not an object') }
      }
      return { value: data }
    }
  }
}, async req => req.body)).type.toBe<FastifyInstance>()

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
}, async req => req.body)).type.toBe<FastifyInstance>()

expect(server.setValidatorCompiler<FastifySchema & { validate: Record<string, unknown> }>(
  function ({ schema }) {
    return new Ajv().compile(schema)
  }
)).type.toBe<FastifyInstance>()

expect(server.setSerializerCompiler<FastifySchema & { validate: string }>(
  () => data => JSON.stringify(data)
)).type.toBe<FastifyInstance>()

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

// The output side of the schema controller: the options of the output pool
// and the factory that builds it.
{
  const outputOptionsServer = fastify({
    schemaController: {
      outputValidatorOptions: {
        customOptions: { allErrors: true },
        plugins: []
      }
    }
  })
  expect(outputOptionsServer).type.toBeAssignableTo<FastifyInstance>()
}

{
  const buildOutputValidator: BuildCompilerFromPool = (externalSchemas, outputValidatorOptions) => {
    expect(externalSchemas).type.toBeAssignableTo<Record<string, unknown>>()
    expect(outputValidatorOptions).type.toBeAssignableTo<{ customOptions?: { allErrors?: boolean } } | undefined>()

    return (schema) => new Ajv().compile(schema)
  }

  const outputFactoryServer = fastify({
    schemaController: {
      compilersFactory: {
        buildOutputValidator
      }
    }
  })
  expect(outputFactoryServer).type.toBeAssignableTo<FastifyInstance>()
}

{
  // The JTD *serializer* factory cannot build an output validator: the output
  // side compiles validators, never serializers.
  const jtdSerializerFactory = AjvCompiler({ jtdSerializer: true })

  fastify({
    schemaController: {
      compilersFactory: {
        // @ts-expect-error  No overload matches this call.
        buildOutputValidator: jtdSerializerFactory
      }
    }
  })
}

// The `mode: 'JTD'` of the input side cannot work on the output side: the
// output pool validates *and* shapes with the JSON Schema semantics, so the
// type does not advertise the JTD mode.
expect<FastifyOutputValidatorOptions>().type.not.toBeAssignableTo<{ mode: 'JTD' }>()

fastify({
  schemaController: {
    outputValidatorOptions: {
      // @ts-expect-error  Type 'string' is not assignable to type 'undefined'.
      mode: 'JTD'
    }
  }
})
