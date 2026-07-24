import * as http from 'node:http'
import * as http2 from 'node:http2'
import * as https from 'node:https'
import { Socket } from 'node:net'
import { BuildCompilerFromPool, ValidatorFactory } from '@fastify/ajv-compiler'
import { FastifyError } from '@fastify/error'
import { Options as FJSOptions, SerializerFactory } from '@fastify/fast-json-stringify-compiler'
import { ConstraintStrategy } from 'find-my-way'
import { ConstructorAction, ProtoAction } from './content-type-parser'
import { FastifyContextConfig } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger, FastifyChildLoggerFactory, FastifyLoggerOptions, LogController, PinoLoggerOptions } from './logger'
import { FastifyReplyForRoute } from './reply'
import { FastifyRequestForRoute } from './request'
import { FastifyRouterOptions, FindMyWayVersion } from './router-options'
import { RouteGenericInterface } from './route'
import { FastifySchema, SchemaErrorFormatter } from './schema'
import { FastifyServerFactory } from './server-factory'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { ContextConfigDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from './utils'

export interface ConnectionError extends Error {
  code: string
  bytesParsed: number
  rawPacket: {
    type: string
    data: number[]
  }
}

export type TrustProxyFunction = (address: string, hop: number) => boolean

/** Options shared by every Fastify server transport. */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = {
  ignoreTrailingSlash?: boolean
  ignoreDuplicateSlashes?: boolean
  connectionTimeout?: number
  keepAliveTimeout?: number
  maxRequestsPerSocket?: number
  forceCloseConnections?: boolean | 'idle'
  requestTimeout?: number
  pluginTimeout?: number
  bodyLimit?: number
  handlerTimeout?: number
  maxParamLength?: number
  /** @deprecated Use `logController.disableRequestLogging` or `isLogDisabled`. */
  disableRequestLogging?:
    | boolean
    | ((
      request: FastifyRequestForRoute<RouteGenericInterface, RawServer, RawRequest, RawReply, FastifySchema,
        TypeProvider, ContextConfigDefault, Logger>
    ) => boolean)
  logController?: LogController
  exposeHeadRoutes?: boolean
  onProtoPoisoning?: ProtoAction
  onConstructorPoisoning?: ConstructorAction
  logger?: boolean | (FastifyLoggerOptions<RawServer> & PinoLoggerOptions)
  loggerInstance?: Logger
  serializerOpts?: FJSOptions | Record<string, unknown>
  serverFactory?: FastifyServerFactory<RawServer, RawRequest, RawReply>
  caseSensitive?: boolean
  allowUnsafeRegex?: boolean
  requestIdHeader?: string | false
  /** @deprecated Use `logController.requestIdLogLabel` instead. */
  requestIdLogLabel?: string
  useSemicolonDelimiter?: boolean
  genReqId?: (request: RawRequest) => string
  trustProxy?: boolean | string | string[] | number | TrustProxyFunction
  querystringParser?: (input: string) => Record<string, unknown>
  constraints?: Record<string, ConstraintStrategy<FindMyWayVersion<RawServer>, unknown>>
  schemaController?: {
    bucket?: (parentSchemas?: unknown) => {
      add(schema: unknown): FastifyInstance
      getSchema(schemaId: string): unknown
      getSchemas(): Record<string, unknown>
    }
    compilersFactory?: {
      buildValidator?: ValidatorFactory
      buildSerializer?: SerializerFactory
    }
  }
  return503OnClosing?: boolean
  ajv?: Parameters<BuildCompilerFromPool>[1]
  frameworkErrors?: (
    error: FastifyError,
    request: FastifyRequestForRoute<RouteGenericInterface, RawServer, RawRequest, RawReply, FastifySchema, TypeProvider,
      FastifyContextConfig, Logger>,
    reply: FastifyReplyForRoute<RouteGenericInterface, RawServer, RawRequest, RawReply, FastifyContextConfig,
      FastifySchema, TypeProvider, Logger>
  ) => void
  rewriteUrl?: (
    this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
    request: RawRequest
  ) => string
  schemaErrorFormatter?: SchemaErrorFormatter
  /** Listener for errors emitted by client connections. */
  clientErrorHandler?: (
    this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
    error: ConnectionError,
    socket: Socket
  ) => void
  childLoggerFactory?: FastifyChildLoggerFactory<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  allowErrorHandlerOverride?: boolean
  routerOptions?: FastifyRouterOptions<RawServer>
}

export type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = FastifyServerOptions<Server, Logger, Request, Reply, TypeProvider> & {
  http2: true
  https: http2.SecureServerOptions
  http2SessionTimeout?: number
}

export type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = FastifyServerOptions<Server, Logger, Request, Reply, TypeProvider> & {
  http2: true
  http2SessionTimeout?: number
}

export type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = FastifyServerOptions<Server, Logger, Request, Reply, TypeProvider> & {
  https: https.ServerOptions | null
}

export type FastifyHttpOptions<
  Server extends http.Server,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = FastifyServerOptions<Server, Logger, Request, Reply, TypeProvider> & {
  http?: http.ServerOptions | null
}
