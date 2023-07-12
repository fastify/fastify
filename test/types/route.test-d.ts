import { FastifyError } from '@fastify/error'
import * as http from 'http'
import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod } from '../../fastify'
import { RequestPayload } from '../../types/hooks'
import { HTTPMethods } from '../../types/utils'

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

const routeHandler: RouteHandlerMethod = function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
}

const routeHandlerWithReturnValue: RouteHandlerMethod = function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)

  return reply.send()
}

type LowerCaseHTTPMethods = 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options';

['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE', 'OPTIONS'].forEach(method => {
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

  expectType<FastifyInstance>(fastify()[lowerCaseMethod]('/', {
    handler: routeHandler,
    errorHandler: (error, request, reply) => {
      expectType<FastifyError>(error)
      reply.send('error')
    },
    childLoggerFactory: function (logger, bindings, opts) {
      return logger.child(bindings, opts)
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
    expectType<string>(req.context.config.url)
    expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
    expectType<string>(res.context.config.foo)
    expectType<number>(res.context.config.bar)
    expectType<boolean>(res.context.config.extra)
    expectType<string>(req.routeConfig.url)
    expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
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
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preParsing: (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
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
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preHandler: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    onResponse: (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
      expectType<number>(res.statusCode)
    },
    onError: (req, res, error, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preSerialization: (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    onSend: (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    handler: (req, res) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    }
  })

  fastify().route<RouteGeneric>({
    url: '/',
    method: method as HTTPMethods,
    config: { foo: 'bar', bar: 100 },
    prefixTrailingSlash: 'slash',
    onRequest: async (req, res, done) => { // these handlers are tested in `hooks.test-d.ts`
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preParsing: async (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
      expectType<RequestPayload>(payload)
      expectAssignable<(err?: FastifyError | null, res?: RequestPayload) => void>(done)
      expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
    },
    preValidation: async (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preHandler: async (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    onResponse: async (req, res, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
      expectType<number>(res.statusCode)
    },
    onError: async (req, res, error, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    preSerialization: async (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    onSend: async (req, res, payload, done) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
    },
    handler: (req, res) => {
      expectType<BodyInterface>(req.body)
      expectType<QuerystringInterface>(req.query)
      expectType<ParamsInterface>(req.params)
      expectType<http.IncomingHttpHeaders & HeadersInterface>(req.headers)
      expectType<string>(req.context.config.foo)
      expectType<number>(req.context.config.bar)
      expectType<string>(req.context.config.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.context.config.method)
      expectType<string>(res.context.config.foo)
      expectType<number>(res.context.config.bar)
      expectType<string>(req.routeConfig.url)
      expectType<HTTPMethods | HTTPMethods[]>(req.routeConfig.method)
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

expectError(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandler,
  schemaErrorFormatter: 500 // Not a valid formatter
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandler,
  schemaErrorFormatter: (errors, dataVar) => new Error('')
}))

expectError(fastify().route({
  prefixTrailingSlash: true // Not a valid value
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandlerWithReturnValue
}))

expectType<boolean>(fastify().hasRoute({
  url: '/',
  method: 'GET'
}))

expectType<boolean>(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: { version: '1.2.0' }
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: 'get',
  handler: routeHandlerWithReturnValue
}))

expectType<FastifyInstance>(fastify().route({
  url: '/',
  method: ['put', 'patch'],
  handler: routeHandlerWithReturnValue
}))
