import * as http from 'node:http'
import type { FastifyError } from '@fastify/error'
import { expect } from 'tstyche'
import fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest, type RouteHandlerMethod } from '../../fastify.js'
import type { RequestPayload } from '../../types/hooks.js'
import type { FindMyWayFindResult } from '../../types/instance.js'
import type { HTTPMethods, RawServerDefault } from '../../types/utils.js'

/*
 * Testing Fastify HTTP Routes and Route Shorthands.
 * Verifies Request and Reply types as well.
 * For the route shorthand tests the argument orders are:
 * - `(path, handler)`
 * - `(path, options, handler)`
 * - `(path, options)`
 */

declare module '../../fastify.js' {
  interface FastifyContextConfig {
    foo: string;
    bar: number;
    includeMessage?: boolean;
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface FastifyRequest<
    RouteGeneric,
    RawServer,
    RawRequest,
    SchemaCompiler,
    TypeProvider,
    ContextConfig,
    Logger,
    RequestType
  > {
    message: ContextConfig extends { includeMessage: true }
      ? string
      : null;
  }
}

const routeHandler: RouteHandlerMethod = function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
}

const routeHandlerWithReturnValue: RouteHandlerMethod = function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()

  return reply.send()
}

const asyncPreHandler = async (request: FastifyRequest) => {
  expect(request).type.toBe<FastifyRequest>()
}

fastify().get('/', { preHandler: asyncPreHandler }, async () => 'this is an example')

fastify().get(
  '/',
  { config: { foo: 'bar', bar: 100, includeMessage: true } },
  (req) => {
    expect(req.message).type.toBe<string>()
  }
)

fastify().get(
  '/',
  { config: { foo: 'bar', bar: 100, includeMessage: false } },
  (req) => {
    expect(req.message).type.toBe<null>()
  }
)

type LowerCaseHTTPMethods = 'delete' | 'get' | 'head' | 'patch' | 'post' | 'put' |
  'options' | 'propfind' | 'proppatch' | 'mkcol' | 'copy' | 'move' | 'lock' |
  'unlock' | 'trace' | 'search' | 'mkcalendar' | 'report'

  ;['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS', 'PROPFIND',
  'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'TRACE', 'SEARCH', 'MKCALENDAR', 'REPORT'
].forEach(method => {
  // route method
  expect(fastify().route({
    method: method as HTTPMethods,
    url: '/',
    handler: routeHandler
  })).type.toBe<FastifyInstance>()

  const lowerCaseMethod: LowerCaseHTTPMethods = method.toLowerCase() as LowerCaseHTTPMethods

  // method as method
  expect(fastify()[lowerCaseMethod]('/', routeHandler)).type.toBe<FastifyInstance>()
  expect(fastify()[lowerCaseMethod]('/', {}, routeHandler)).type.toBe<FastifyInstance>()
  expect(fastify()[lowerCaseMethod]('/', { handler: routeHandler })).type.toBe<FastifyInstance>()

  expect(fastify()[lowerCaseMethod]('/', {
    handler: routeHandler,
    errorHandler: (error, request, reply) => {
      expect(error).type.toBe<FastifyError>()
      reply.send('error')
    },
    childLoggerFactory: function (logger, bindings, opts) {
      return logger.child(bindings, opts)
    }
  })).type.toBe<FastifyInstance>()

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
    expect(req.body).type.toBe<BodyInterface>()
    expect(req.query).type.toBe<QuerystringInterface>()
    expect(req.params).type.toBe<ParamsInterface>()
    expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
    expect(req.routeOptions.config.foo).type.toBe<string>()
    expect(req.routeOptions.config.bar).type.toBe<number>()
    expect(req.routeOptions.config.extra).type.toBe<boolean>()
    expect(req.routeOptions.config.url).type.toBe<string>()
    expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    expect(res.routeOptions.config.foo).type.toBe<string>()
    expect(res.routeOptions.config.bar).type.toBe<number>()
    expect(res.routeOptions.config.extra).type.toBe<boolean>()
    expect(req.routeOptions.config.url).type.toBe<string>()
    expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
  })

  fastify().route<RouteGeneric>({
    url: '/',
    method: method as HTTPMethods,
    config: { foo: 'bar', bar: 100 },
    prefixTrailingSlash: 'slash',
    onRequest: (req, res, done) => { // these handlers are tested in `hooks.test-d.ts`
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preParsing: (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(payload).type.toBe<RequestPayload>()
      expect(done).type.toBeAssignableTo<(err?: FastifyError | null, res?: RequestPayload) => void>()
      expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
    },
    preValidation: (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preHandler: (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    onResponse: (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.statusCode).type.toBe<number>()
    },
    onError: (req, res, error, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preSerialization: (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    onSend: (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    handler: (req, res) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    }
  })

  fastify().route<RouteGeneric>({
    url: '/',
    method: method as HTTPMethods,
    config: { foo: 'bar', bar: 100 },
    prefixTrailingSlash: 'slash',
    onRequest: async (req, res, done) => { // these handlers are tested in `hooks.test-d.ts`
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preParsing: async (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(payload).type.toBe<RequestPayload>()
      expect(done).type.toBeAssignableTo<(err?: FastifyError | null, res?: RequestPayload) => void>()
      expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
    },
    preValidation: async (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preHandler: async (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    onResponse: async (req, res, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.statusCode).type.toBe<number>()
    },
    onError: async (req, res, error, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    preSerialization: async (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    onSend: async (req, res, payload, done) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    },
    handler: (req, res) => {
      expect(req.body).type.toBe<BodyInterface>()
      expect(req.query).type.toBe<QuerystringInterface>()
      expect(req.params).type.toBe<ParamsInterface>()
      expect(req.headers).type.toBe<http.IncomingHttpHeaders & HeadersInterface>()
      expect(req.routeOptions.config.foo).type.toBe<string>()
      expect(req.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
      expect(res.routeOptions.config.foo).type.toBe<string>()
      expect(res.routeOptions.config.bar).type.toBe<number>()
      expect(req.routeOptions.config.url).type.toBe<string>()
      expect(req.routeOptions.config.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    }
  })
})

expect(fastify().route({
  url: '/',
  method: 'CONNECT', // not a valid method but could be implemented by the user
  handler: routeHandler
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: 'OPTIONS',
  handler: routeHandler
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: 'OPTION', // OPTION is a typo for OPTIONS
  handler: routeHandler
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: ['GET', 'POST'],
  handler: routeHandler
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: ['GET', 'POST', 'OPTION'], // OPTION is a typo for OPTIONS
  handler: routeHandler
})).type.toBe<FastifyInstance>()

expect(fastify().route).type.not.toBeCallableWith({
  url: '/',
  method: 'GET',
  handler: routeHandler,
  schemaErrorFormatter: 500 // Not a valid formatter
})

expect(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandler,
  schemaErrorFormatter: (errors, dataVar) => new Error('')
})).type.toBe<FastifyInstance>()

expect(fastify().route).type.not.toBeCallableWith({
  prefixTrailingSlash: true // Not a valid value
})

expect(fastify().route({
  url: '/',
  method: 'GET',
  handler: routeHandlerWithReturnValue
})).type.toBe<FastifyInstance>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET'
})).type.toBe<boolean>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: { version: '1.2.0' }
})).type.toBe<boolean>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: { host: 'auth.fastify.dev' }
})).type.toBe<boolean>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: { host: /.*\.fastify\.dev$/ }
})).type.toBe<boolean>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: { host: /.*\.fastify\.dev$/, version: '1.2.3' }
})).type.toBe<boolean>()

expect(fastify().hasRoute({
  url: '/',
  method: 'GET',
  constraints: {
    // constraints value should accept any value
    number: 12,
    date: new Date(),
    boolean: true,
    function: () => { },
    object: { foo: 'bar' }
  }
})).type.toBe<boolean>()

expect(
  fastify().findRoute({
    url: '/',
    method: 'get'
  })
).type.toBe<Omit<FindMyWayFindResult<RawServerDefault>, 'store'>>()

// we should not expose store
expect(fastify().findRoute({
  url: '/',
  method: 'get'
})).type.not.toHaveProperty('store')

expect(fastify().route({
  url: '/',
  method: 'get',
  handler: routeHandlerWithReturnValue
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: ['put', 'patch'],
  handler: routeHandlerWithReturnValue
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: 'GET',
  handler: (req) => {
    expect(req.routeOptions.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    expect(req.routeOptions.method).type.toBeAssignableTo<string | Array<string>>()
  }
})).type.toBe<FastifyInstance>()

expect(fastify().route({
  url: '/',
  method: ['HEAD', 'GET'],
  handler: (req) => {
    expect(req.routeOptions.method).type.toBe<HTTPMethods | HTTPMethods[]>()
    expect(req.routeOptions.method).type.toBeAssignableTo<string | Array<string>>()
  }
})).type.toBe<FastifyInstance>()
