import Ajv, { type ErrorObject as AjvErrorObject } from 'ajv'
import * as http from 'node:http'
import type * as http2 from 'node:http2'
import type * as https from 'node:https'
import type { Socket } from 'node:net'
import { expect } from 'tstyche'
import fastify, {
  type ConnectionError,
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyErrorCodes,
  type FastifyInstance,
  type FastifyPlugin,
  type FastifyPluginAsync,
  type FastifyPluginCallback,
  type InjectOptions,
  type LightMyRequestCallback,
  type LightMyRequestChain,
  type LightMyRequestResponse,
  type RawRequestDefaultExpression,
  type RouteGenericInterface,
  type SafePromiseLike
} from '../../fastify.js'
import type { Bindings, ChildLoggerOptions } from '../../types/logger.js'

// FastifyInstance
// http server
expect(fastify()).type.not.toBeAssignableTo<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  Promise<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify()).type.toBeAssignableTo<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  PromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify()).type.toBe<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify({})).type.toBe<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify({ http: {} })).type.toBe<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
// https server
expect(fastify({ https: {} })).type.toBe<
  FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify({ https: null })).type.toBe<
  FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>
>()
// http2 server
expect(fastify({ http2: true, http2SessionTimeout: 1000 })).type.toBe<
  FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse> &
  SafePromiseLike<FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>>
>()
expect(fastify({ http2: true, https: {}, http2SessionTimeout: 1000 })).type.toBe<
  FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse> &
  SafePromiseLike<FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>>
>()
expect(fastify({ http2: true, https: {} }).inject()).type.toBe<LightMyRequestChain>()
expect(fastify({ schemaController: {} })).type.toBe<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(fastify({ schemaController: { compilersFactory: {} } })).type.toBe<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>>
>()

// @ts-expect-error  Type 'false' is not assignable to type 'true'
fastify<http2.Http2Server>({ http2: false }) // http2 option must be true
// @ts-expect-error  Type 'false' is not assignable to type 'true'
fastify<http2.Http2SecureServer>({ http2: false }) // http2 option must be true
fastify({
  schemaController: {
    // @ts-expect-error  No overload matches this call
    bucket: () => ({}) // cannot be empty
  }
})

// light-my-request
expect<InjectOptions>().type.toBeAssignableFrom({ query: '' })
fastify({ http2: true, https: {} }).inject().then((resp) => {
  expect(resp).type.toBe<LightMyRequestResponse>()
})
const lightMyRequestCallback: LightMyRequestCallback = (
  err: Error | undefined,
  response: LightMyRequestResponse | undefined
) => {
  if (err) throw err
}
fastify({ http2: true, https: {} }).inject({}, lightMyRequestCallback)

// server options
expect(fastify({ http2: true })).type.toBeAssignableTo<
  FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>
>()
expect(fastify({ ignoreTrailingSlash: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ ignoreDuplicateSlashes: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ connectionTimeout: 1000 })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ forceCloseConnections: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ keepAliveTimeout: 1000 })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ pluginTimeout: 1000 })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ bodyLimit: 100 })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ maxParamLength: 100 })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ disableRequestLogging: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ disableRequestLogging: (req) => req.url?.includes('/health') ?? false })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ requestIdLogLabel: 'request-id' })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ onProtoPoisoning: 'error' })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ onConstructorPoisoning: 'error' })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ serializerOpts: { rounding: 'ceil' } })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ serializerOpts: { ajv: { missingRefs: 'ignore' } } })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ serializerOpts: { schema: {} } })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ serializerOpts: { otherProp: {} } })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ logger: true })).type.toBeAssignableTo<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse, FastifyBaseLogger>
>()
expect(fastify({
  logger: {
    level: 'info',
    genReqId: () => 'request-id',
    serializers: {
      req: () => {
        return {
          method: 'GET',
          url: '/',
          version: '1.0.0',
          host: 'localhost',
          remoteAddress: '127.0.0.1',
          remotePort: 3000
        }
      },
      res: () => {
        return {
          statusCode: 200
        }
      },
      err: () => {
        return {
          type: 'Error',
          message: 'foo',
          stack: ''
        }
      }
    }
  }
})).type.toBeAssignableTo<FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse, FastifyBaseLogger>>()
const customLogger = {
  level: 'info',
  info: () => { },
  warn: () => { },
  error: () => { },
  fatal: () => { },
  trace: () => { },
  debug: () => { },
  child: () => customLogger
}
expect(fastify({ logger: customLogger })).type.toBeAssignableTo<
  FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse, FastifyBaseLogger>
>()
expect(fastify({ serverFactory: () => http.createServer() })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ caseSensitive: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ requestIdHeader: 'request-id' })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ requestIdHeader: false })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  genReqId: (req) => {
    expect(req).type.toBe<RawRequestDefaultExpression>()
    return 'foo'
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ trustProxy: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ querystringParser: () => ({ foo: 'bar' }) })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ querystringParser: () => ({ foo: { bar: 'fuzz' } }) })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ querystringParser: () => ({ foo: ['bar', 'fuzz'] }) })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ constraints: {} })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  constraints: {
    version: {
      name: 'version',
      storage: () => ({
        get: () => () => { },
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () { },
      deriveConstraint: () => 'foo'
    },
    host: {
      name: 'host',
      storage: () => ({
        get: () => () => { },
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () { },
      deriveConstraint: () => 'foo'
    },
    withObjectValue: {
      name: 'withObjectValue',
      storage: () => ({
        get: () => () => { },
        set: () => { },
        del: () => { },
        empty: () => { }
      }),
      validate () { },
      deriveConstraint: () => { }

    }
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ return503OnClosing: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  ajv: {
    customOptions: {
      removeAdditional: 'all'
    },
    plugins: [(ajv: Ajv): Ajv => ajv]
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  ajv: {
    plugins: [[(ajv: Ajv): Ajv => ajv, ['keyword1', 'keyword2']]]
  }
})).type.toBeAssignableTo<FastifyInstance>()
fastify({
  ajv: {
    customOptions: {
      removeAdditional: 'all'
    },
    plugins: [
      // @ts-expect-error  Type 'void' is not assignable to type 'Ajv'.
      () => { }
    ]
  }
})
expect(fastify({
  ajv: {
    onCreate: (ajvInstance) => {
      expect(ajvInstance).type.toBe<Ajv>()
      return ajvInstance
    }
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({ frameworkErrors: () => { } })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  rewriteUrl: function (req) {
    this.log.debug('rewrite url')
    return req.url === '/hi' ? '/hello' : req.url!
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  schemaErrorFormatter: (errors, dataVar) => {
    console.log(
      errors[0].keyword.toLowerCase(),
      errors[0].message?.toLowerCase(),
      errors[0].params,
      errors[0].instancePath.toLowerCase(),
      errors[0].schemaPath.toLowerCase()
    )
    return new Error()
  }
})).type.toBeAssignableTo<FastifyInstance>()
expect(fastify({
  clientErrorHandler: (err, socket) => {
    expect(err).type.toBe<ConnectionError>()
    expect(socket).type.toBe<Socket>()
  }
})).type.toBeAssignableTo<FastifyInstance>()

expect(fastify({
  childLoggerFactory: function (
    this: FastifyInstance,
    logger: FastifyBaseLogger,
    bindings: Bindings,
    opts: ChildLoggerOptions,
    req: RawRequestDefaultExpression
  ) {
    expect(logger).type.toBe<FastifyBaseLogger>()
    expect(bindings).type.toBe<Bindings>()
    expect(opts).type.toBe<ChildLoggerOptions>()
    expect(req).type.toBe<RawRequestDefaultExpression>()
    expect(this).type.toBe<FastifyInstance>()
    return logger.child(bindings, opts)
  }
})).type.toBeAssignableTo<FastifyInstance>()

// Thenable
expect(fastify({ return503OnClosing: true })).type.toBeAssignableTo<PromiseLike<FastifyInstance>>()
fastify().then(fastifyInstance => expect(fastifyInstance).type.toBeAssignableTo<FastifyInstance>())

expect<FastifyPluginAsync>().type.toBeAssignableFrom(async () => { })
expect<FastifyPluginCallback>().type.toBeAssignableFrom(() => { })
expect<FastifyPlugin>().type.toBeAssignableFrom(() => { })

const ajvErrorObject: AjvErrorObject = {
  keyword: '',
  instancePath: '',
  schemaPath: '',
  params: {},
  message: ''
}
expect<AjvErrorObject>().type.not.toBeAssignableFrom({
  keyword: '',
  instancePath: '',
  schemaPath: '',
  params: '',
  message: ''
})

expect<FastifyError['validation']>().type.toBeAssignableFrom([ajvErrorObject])
expect<FastifyError['validationContext']>().type.toBeAssignableFrom('body')
expect<FastifyError['validationContext']>().type.toBeAssignableFrom('headers')
expect<FastifyError['validationContext']>().type.toBeAssignableFrom('params')
expect<FastifyError['validationContext']>().type.toBeAssignableFrom('querystring')

const routeGeneric: RouteGenericInterface = {}
expect(routeGeneric.Body).type.toBe<unknown>()
expect(routeGeneric.Headers).type.toBe<unknown>()
expect(routeGeneric.Params).type.toBe<unknown>()
expect(routeGeneric.Querystring).type.toBe<unknown>()
expect(routeGeneric.Reply).type.toBe<unknown>()

// ErrorCodes
expect(fastify.errorCodes).type.toBe<FastifyErrorCodes>()

fastify({ allowUnsafeRegex: true })
fastify({ allowUnsafeRegex: false })
expect(fastify).type.not.toBeCallableWith({ allowUnsafeRegex: 'invalid' })

expect<FastifyInstance>().type.toBeAssignableFrom(fastify({ allowErrorHandlerOverride: true }))
expect<FastifyInstance>().type.toBeAssignableFrom(fastify({ allowErrorHandlerOverride: false }))
