import fastify, { FastifyTypeProvider } from '../../fastify'
import { Type, Static } from '@sinclair/typebox'
import { expectAssignable, expectType } from 'tsd'
import { IncomingHttpHeaders } from 'http'

const server = fastify()

// -------------------------------------------------------------------
// Remapping
// -------------------------------------------------------------------

interface NumberProvider extends FastifyTypeProvider { output: number } // remap all schemas to numbers

expectAssignable(server.typeProvider<NumberProvider>().get(
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
// Override if specifying generic arguments
// -------------------------------------------------------------------

interface OverriddenProvider extends FastifyTypeProvider { output: 'inferenced' }

expectAssignable(server.typeProvider<OverriddenProvider>().get<{ Body: 'override' }>(
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

interface TypeBoxProvider extends FastifyTypeProvider { output: Static<this['input']> }

expectAssignable(server.typeProvider<TypeBoxProvider>().get(
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
