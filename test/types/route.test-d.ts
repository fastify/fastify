import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod, RequestGenericInterface } from '../../fastify'
import { expectType, expectError } from 'tsd'
import { HTTPMethods } from '../../types/utils'
import * as http from 'http'

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

  type BodyType = { prop: string }
  type QuerystringType = { prop: number }
  type ParamsType = { prop: boolean }
  type HeadersType = { prop: string }

  interface ContextConfigType {
    foo: string;
    bar: number;
  }

  type RouteGeneric = {
    Body: BodyType, 
    Querystring: QuerystringType, 
    Params: ParamsType,
    Headers: HeadersType
  }

  fastify()[lowerCaseMethod]<RouteGeneric, ContextConfigType>('/', { config: { foo: 'bar', bar: 100 } }, (req, res) => {
    expectType<BodyType>(req.body)
    expectType<QuerystringType>(req.query)
    expectType<ParamsType>(req.params)
    expectType<http.IncomingHttpHeaders & HeadersType>(req.headers)
    expectType<string>(res.context.config.foo)
    expectType<number>(res.context.config.bar)
  })

  fastify().route<RouteGeneric, ContextConfigType>({
    url: '/',
    method: method as HTTPMethods,
    config: { foo: 'bar', bar: 100 },
    preHandler: (req, res) => {
      expectType<BodyType>(req.body)
      expectType<QuerystringType>(req.query)
      expectType<ParamsType>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersType>(req.headers)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    preValidation: (req, res) => {
      expectType<BodyType>(req.body)
      expectType<QuerystringType>(req.query)
      expectType<ParamsType>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersType>(req.headers)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    preSerialization: (req, res) => {
      expectType<BodyType>(req.body)
      expectType<QuerystringType>(req.query)
      expectType<ParamsType>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersType>(req.headers)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    handler: (req, res) => {
      expectType<BodyType>(req.body)
      expectType<QuerystringType>(req.query)
      expectType<ParamsType>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersType>(req.headers)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    }
  })
})

expectError(fastify().route({
  url: '/',
  method: 'CONNECT', // not a valid method
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
