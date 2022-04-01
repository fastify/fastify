import fastify, { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod } from '../../fastify'
import { expectType, expectError, expectAssignable } from 'tsd'
import { HTTPMethods } from '../../types/utils'
import * as http from 'http'
import { RequestPayload } from '../../types/hooks'
import { FastifyError } from 'fastify-error'

/*
 * Testing Fastify HTTP Routes and Route Shorthands.
 * Verifies Request and Reply types as well.
 * For the route shorthand tests the argument orders are:
 * - `(path, handler)`
 * - `(path, options, handler)`
 * - `(path, options)`
 */

declare module '../../fastify' {
  interface FastifyContextConfig {
    foo: string;
    bar: number;
  }
}

const routeHandlerPayload: RouteHandlerMethod = function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return { something: 'returned' }
}

const routeHandlerReply: RouteHandlerMethod = function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  return reply.send({ something: 'returned' })
}

type LowerCaseHTTPMethods = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options'

;['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS'].forEach(method => {
  // route method
  expectType<FastifyInstance>(fastify().route({
    method: method as HTTPMethods,
    url: '/',
    handler: routeHandlerReply
  }))
  expectType<FastifyInstance>(fastify().route({
    method: method as HTTPMethods,
    url: '/',
    handler: routeHandlerPayload
  }))

  const lowerCaseMethod: LowerCaseHTTPMethods = method.toLowerCase() as LowerCaseHTTPMethods

  // method as method
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', routeHandlerReply))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {}, routeHandlerReply))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', { handler: routeHandlerReply }))

  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', routeHandlerPayload))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {}, routeHandlerPayload))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', { handler: routeHandlerPayload }))

  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {
    handler: routeHandlerReply,
    errorHandler: (error, request, reply) => {
      expectType<FastifyError>(error)
      reply.send('error')
    }
  }))
  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {
    handler: routeHandlerPayload,
    errorHandler: (error, request, reply) => {
      expectType<FastifyError>(error)
      reply.send('error')
    }
  }))

  interface BodyInterface { prop: string }
  interface QuerystringInterface { prop: number }
  interface ParamsInterface { prop: boolean }
  interface HeadersInterface { prop: string }
  interface RouteSpecificContextConfigType {
    extra: boolean
  }
  interface RouteGeneric {
    Body: BodyInterface;
    Querystring: QuerystringInterface;
    Params: ParamsInterface;
    Headers: HeadersInterface;
  }

  fastify()[lowerCaseMethod]<RouteGeneric, RouteSpecificContextConfigType>('/', { config: { foo: 'bar', bar: 100, extra: true } }, (req, res) => {
    expectType<BodyInterface>(req.body)
    expectType<QuerystringInterface>(req.query)
    expectType<ParamsInterface>(req.params)
    expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
    expectType<string>(req.context.config.foo)
    expectType<number>(req.context.config.bar)
    expectType<boolean>(req.context.config.extra)
    expectType<string>(res.context.config.foo)
    expectType<number>(res.context.config.bar)
    expectType<boolean>(res.context.config.extra)
  })

  fastify().route<RouteGeneric>({
    url: '/',
    method: method as HTTPMethods,
    config: { foo: 'bar', bar: 100 },
    prefixTrailingSlash: 'slash',
    onRequest: (req, res, done) => { // these handlers are tested in `hooks.test-d.ts`
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    preParsing: (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<RequestPayload>(payload)
      expectAssignable<(err?: FastifyError | null, res?: RequestPayload) => void>(done)
      expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
    },
    preValidation: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    preHandler: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    onResponse: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<number>(res.statusCode)
    },
    onError: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    preSerialization: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    onSend: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
    },
    handler: (req, res) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      return 'something'
    }
  })
})

expectError(fastify().route({
  url: '/',
  method: 'CONNECT', // not a valid method
  handler: routeHandlerPayload
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: ['GET', 'POST'],
  handler: routeHandlerPayload
}))

expectError(fastify().route({
  url: '/',
  method: ['GET', 'POST', 'OPTION'], // OPTION is a typo for OPTIONS
  handler: routeHandlerPayload
}))

expectError(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandlerPayload,
  schemaErrorFormatter: 500 // Not a valid formatter
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandlerPayload,
  schemaErrorFormatter: (errors, dataVar) => new Error('')
}))

expectError(fastify().route({
  prefixTrailingSlash: true // Not a valid value
}))

expectError(fastify().route({
  url:'/',
  method:'GET',
  handler: (req,reply)=>{
    return
  }
}))

expectError(fastify().route({
  url:'/',
  method:'GET',
  handler: async (req,reply) => {
    return
  }
}))

expectError(fastify().route({
  url:'/',
  method:'GET',
  handler: (req,reply) => {
    return undefined
  }
}))

expectError(fastify().route({
  url:'/',
  method:'GET',
  handler: async (req,reply) => {
    return undefined
  }
}))
