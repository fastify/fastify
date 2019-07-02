import fastify, {FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from '../../fastify'
import {expectType, expectError} from 'tsd'
import { HTTPMethods } from '../../types/utils';

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

type LowerCaseHTTPMethods = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options'

;['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS'].forEach(method => {
  // route method
  expectType<FastifyInstance>(fastify().route({
    method: method as HTTPMethods,
    url: '/',
    handler: routeHandler
  }))

  const lowerCaseMethod: LowerCaseHTTPMethods = method.toLowerCase() as LowerCaseHTTPMethods

  // method as method
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', routeHandler))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {}, routeHandler))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', { handler: routeHandler }))

  type BodyType = void
  type QuerystringType = void
  type ParamsType = void
  type HeadersType = void
  fastify()[lowerCaseMethod]<BodyType, QuerystringType, ParamsType, HeadersType>('/', (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    // expectType<HeadersType>(req.headers)
  })

  fastify().route<BodyType, QuerystringType, ParamsType, HeadersType>({
    url: '/',
    method: method as HTTPMethods,
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
})

expectError(fastify().route({
  url: '/',
  method: 'CONNECT',
  handler: routeHandler
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: ['GET', 'POST'],
  handler: routeHandler
}))

expectError(fastify().route({
  url: '/',
  method: ['GET', 'POST', 'OPTION'], // OPTION is a typo for OPTIONS
  handler: routeHandler
}))