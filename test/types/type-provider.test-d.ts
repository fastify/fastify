import fastify, { FastifyTypeProvider } from '../../fastify'
import { expectAssignable, expectType } from 'tsd'
import { IncomingHttpHeaders } from 'http'
import { Type, TSchema, Static } from '@sinclair/typebox'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

const server = fastify()

// -------------------------------------------------------------------
// Remapping
// -------------------------------------------------------------------

interface NumberProvider extends FastifyTypeProvider { output: number } // remap all schemas to numbers

expectAssignable(server.withTypeProvider<NumberProvider>().get(
  '/',
  {
    schema: {
      body: { type: 'string' },
      querystring: { type: 'string' },
      headers: { type: 'string' },
      params: { type: 'string' }
    }
  },
  (req) => {
    expectType<number & IncomingHttpHeaders>(req.headers)
    expectType<number>(req.body)
    expectType<number>(req.query)
    expectType<number>(req.params)
  }
))

// -------------------------------------------------------------------
// Override
// -------------------------------------------------------------------

interface OverriddenProvider extends FastifyTypeProvider { output: 'inferenced' }

expectAssignable(server.withTypeProvider<OverriddenProvider>().get<{ Body: 'override' }>(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.Number(),
        z: Type.Number()
      })
    }
  },
  (req) => {
    expectType<'override'>(req.body)
  }
))

// -------------------------------------------------------------------
// TypeBox
// -------------------------------------------------------------------

interface TypeBoxProvider extends FastifyTypeProvider { output: this['input'] extends TSchema ? Static<this['input']> : never }

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.Number(),
        z: Type.Number()
      })
    }
  },
  (req) => {
    expectType<number>(req.body.x)
    expectType<number>(req.body.y)
    expectType<number>(req.body.z)
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs
// -------------------------------------------------------------------

interface JsonSchemaToTsProvider extends FastifyTypeProvider { output: this['input'] extends JSONSchema ? FromSchema<this['input']> : never }

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'string' },
          z: { type: 'boolean' }
        }
      } as const
    }
  },
  (req) => {
    expectType<number | undefined>(req.body.x)
    expectType<string | undefined>(req.body.y)
    expectType<boolean | undefined>(req.body.z)
  }
))

// -------------------------------------------------------------------
// Instance Type Remappable
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      body: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'string' },
          z: { type: 'boolean' }
        }
      } as const
    }
  },
  (req) => {
    expectType<number | undefined>(req.body.x)
    expectType<string | undefined>(req.body.y)
    expectType<boolean | undefined>(req.body.z)
  }
))

// -------------------------------------------------------------------
// Request Hooks
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      body: Type.Object({
        x: Type.Number(),
        y: Type.String(),
        z: Type.Boolean()
      })
    },
    preHandler: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preParsing: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preSerialization: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    preValidation: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onError: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onRequest: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onResponse: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onTimeout: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    },
    onSend: req => {
      expectType<number>(req.body.x)
      expectType<string>(req.body.y)
      expectType<boolean>(req.body.z)
    }
  },
  req => {
    expectType<number>(req.body.x)
    expectType<string>(req.body.y)
    expectType<boolean>(req.body.z)
  }
))

// -------------------------------------------------------------------
// TypeBox Response Type
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    res.send('hello')
    res.send(42)
    res.send({ error: 'error' })
  }
))
// -------------------------------------------------------------------
// TypeBox Response Type: Return
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<TypeBoxProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: Type.String(),
        400: Type.Number(),
        500: Type.Object({
          error: Type.String()
        })
      }
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return 42
      case 3: return { error: 'error' }
    }
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Response Type
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    res.send('hello')
    res.send(42)
    res.send({ error: 'error' })
  }
))

// -------------------------------------------------------------------
// JsonSchemaToTs Response Type: Return
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    const option = 1 as 1 | 2 | 3
    switch (option) {
      case 1: return 'hello'
      case 2: return 42
      case 3: return { error: 'error' }
    }
  }
))

// -------------------------------------------------------------------
// Response Type Override
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: number}>(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    res.send(42)
  }
))

// -------------------------------------------------------------------
// Response Type Override: Return
// -------------------------------------------------------------------

expectAssignable(server.withTypeProvider<JsonSchemaToTsProvider>().get<{Reply: number}>(
  '/',
  {
    schema: {
      response: {
        200: { type: 'string' },
        400: { type: 'number' },
        500: { type: 'object', properties: { error: { type: 'string' } } }
      } as const
    }
  },
  async (_, res) => {
    return 42
  }
))
