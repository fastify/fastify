import fastify, {FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from '../../fastify'
import {expectType} from 'tsd'

/*
 * Testing Fastify HTTP Routes and Route Shorthands.
 * Verifies Request and Reply types as well.
 * For the route shorthand tests the argument orders are:
 * - `(path, handler)`
 * - `(path, options, handler)`
 * - `(path, options)`
 */

const routeHandler: RouteHandlerMethod = (request, reply) => {
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
}

// route method
expectType<FastifyInstance>(fastify().route({
  method: 'GET',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'POST',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'PUT',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'PATCH',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'HEAD',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'DELETE',
  url: '/',
  handler: routeHandler
}))
expectType<FastifyInstance>(fastify().route({
  method: 'OPTIONS',
  url: '/',
  handler: routeHandler
}))

// get
expectType<FastifyInstance>(fastify().get('/', routeHandler))
expectType<FastifyInstance>(fastify().get('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().get('/', { handler: routeHandler }))

// post
expectType<FastifyInstance>(fastify().post('/', routeHandler))
expectType<FastifyInstance>(fastify().post('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().post('/', { handler: routeHandler }))

// put
expectType<FastifyInstance>(fastify().put('/', routeHandler))
expectType<FastifyInstance>(fastify().put('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().put('/', { handler: routeHandler }))

// patch
expectType<FastifyInstance>(fastify().patch('/', routeHandler))
expectType<FastifyInstance>(fastify().patch('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().patch('/', { handler: routeHandler }))

// head
expectType<FastifyInstance>(fastify().head('/', routeHandler))
expectType<FastifyInstance>(fastify().head('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().head('/', { handler: routeHandler }))

// delete
expectType<FastifyInstance>(fastify().delete('/', routeHandler))
expectType<FastifyInstance>(fastify().delete('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().delete('/', { handler: routeHandler }))

// options
expectType<FastifyInstance>(fastify().options('/', routeHandler))
expectType<FastifyInstance>(fastify().options('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().options('/', { handler: routeHandler }))

// all
expectType<FastifyInstance>(fastify().all('/', routeHandler))
expectType<FastifyInstance>(fastify().all('/', {}, routeHandler))
expectType<FastifyInstance>(fastify().all('/', { handler: routeHandler }))

type BodyType = void
type QuerystringType = void
type ParamsType = void
type HeadersType = void
fastify().get<BodyType, QuerystringType, ParamsType, HeadersType>('/', (req, res) => {
  expectType<BodyType>(req.body)
  expectType<QuerystringType>(req.query)
  expectType<ParamsType>(req.params)
  // expectType<HeadersType>(req.headers)
})

fastify().route<BodyType, QuerystringType, ParamsType, HeadersType>({
  url: '/',
  method: 'GET',
  preHandler: (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    // expectType<HeadersType>(req.headers)
  },
  preValidation: (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    // expectType<HeadersType>(req.headers)
  },
  preSerialization: (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    // expectType<HeadersType>(req.headers)
  },
  handler: (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    // expectType<HeadersType>(req.headers)
  }
})