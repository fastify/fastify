import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { ConstraintStrategy, HTTPVersion } from 'find-my-way'

import { FastifyRequest, RequestGenericInterface } from './types/request'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './types/utils'
import { FastifyBaseLogger, FastifyLoggerInstance, FastifyLoggerOptions, PinoLoggerOptions } from './types/logger'
import { FastifyInstance } from './types/instance'
import { FastifyServerFactory } from './types/serverFactory'
import { Options as AjvOptions } from '@fastify/ajv-compiler'
import { Options as FJSOptions } from '@fastify/fast-json-stringify-compiler'
import { FastifyError } from '@fastify/error'
import { FastifyReply } from './types/reply'
import { FastifySchemaValidationError } from './types/schema'
import { ConstructorAction, ProtoAction } from "./types/content-type-parser";
import { Socket } from 'net'
import { ValidatorCompiler } from '@fastify/ajv-compiler'
import { SerializerCompiler } from '@fastify/fast-json-stringify-compiler'
import { FastifySchema } from './types/schema'
import { FastifyContextConfig } from './types/context'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './types/type-provider'

/**
 * Fastify factory function for the standard fastify http, https, or http2 server instance.
 *
 * The default function utilizes http
 *
 * @param opts Fastify server options
 * @returns Fastify server instance
 */
declare function fastify<
  Server extends http2.Http2SecureServer,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: FastifyHttp2SecureOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: FastifyHttp2Options<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: FastifyHttpsOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts?: FastifyServerOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

export default fastify

export type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true,
  https: http2.SecureServerOptions,
  http2SessionTimeout?: number
}

export type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true,
  http2SessionTimeout?: number
}

export type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions
}

type FindMyWayVersion<RawServer extends RawServerBase> = RawServer extends http.Server ? HTTPVersion.V1 : HTTPVersion.V2

export interface ConnectionError extends Error {
  code: string,
  bytesParsed: number,
  rawPacket: {
    type: string,
    data: number[]
  }
}

/**
 * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
 */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  Logger extends FastifyBaseLogger = FastifyLoggerInstance
> = {
  ignoreTrailingSlash?: boolean,
  ignoreDuplicateSlashes?: boolean,
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  maxRequestsPerSocket?: number,
  forceCloseConnections?: boolean | 'idle',
  requestTimeout?: number,
  pluginTimeout?: number,
  bodyLimit?: number,
  maxParamLength?: number,
  disableRequestLogging?: boolean,
  exposeHeadRoutes?: boolean,
  onProtoPoisoning?: ProtoAction,
  onConstructorPoisoning?: ConstructorAction,
  logger?: boolean | FastifyLoggerOptions<RawServer> & PinoLoggerOptions | Logger,
  serializerOpts?: FJSOptions | Record<string, unknown>,
  serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string | false,
  requestIdLogLabel?: string;
  jsonShorthand?: boolean;
  genReqId?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault>(req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, TypeProvider>) => string,
  trustProxy?: boolean | string | string[] | number | TrustProxyFunction,
  querystringParser?: (str: string) => { [key: string]: unknown },
  /**
   * @deprecated Prefer using the `constraints.version` property
   */
  versioning?: {
    storage(): {
      get(version: string): string | null,
      set(version: string, store: Function): void
      del(version: string): void,
      empty(): void
    },
    deriveVersion<Context>(req: Object, ctx?: Context): string // not a fan of using Object here. Also what is Context? Can either of these be better defined?
  },
  constraints?: {
    [name: string]: ConstraintStrategy<FindMyWayVersion<RawServer>, unknown>,
  },
  schemaController?: {
    bucket?: (parentSchemas?: unknown) => {
      add(schema: unknown): FastifyInstance;
      getSchema(schemaId: string): unknown;
      getSchemas(): Record<string, unknown>;
    };
    compilersFactory?: {
      buildValidator?: ValidatorCompiler;
      buildSerializer?: SerializerCompiler;
    };
  };
  return503OnClosing?: boolean,
  ajv?: {
    customOptions?: AjvOptions,
    plugins?: (Function | [Function, unknown])[]
  },
  frameworkErrors?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, SchemaCompiler extends FastifySchema = FastifySchema>(
    error: FastifyError,
    req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, TypeProvider>,
    res: FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>, RequestGeneric, FastifyContextConfig, SchemaCompiler, TypeProvider>
  ) => void,
  rewriteUrl?: (req: RawRequestDefaultExpression<RawServer>) => string,
  schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error,
  /**
   * listener to error events emitted by client connections
   */
  clientErrorHandler?: (error: ConnectionError, socket: Socket) => void
}

type TrustProxyFunction = (address: string, hop: number) => boolean

declare module '@fastify/error' {
  interface FastifyError {
    validation?: ValidationResult[];
  }
}

export interface ValidationResult {
  keyword: string;
  instancePath: string;
  schemaPath: string;
  params: Record<string, string | string[]>;
  message?: string;
}

/* Export all additional types */
export type { Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse, CallbackFunc as LightMyRequestCallback } from 'light-my-request'
export { FastifyRequest, RequestGenericInterface } from './types/request'
export { FastifyReply } from './types/reply'
export { FastifyPluginCallback, FastifyPluginAsync, FastifyPluginOptions, FastifyPlugin } from './types/plugin'
export { FastifyListenOptions, FastifyInstance, PrintRoutesOptions } from './types/instance'
export { FastifyLoggerOptions, FastifyBaseLogger, FastifyLoggerInstance, FastifyLogFn, LogLevel } from './types/logger'
export { FastifyContext, FastifyContextConfig } from './types/context'
export { RouteHandler, RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export * from './types/register'
export { FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser, getDefaultJsonParser, ProtoAction, ConstructorAction } from './types/content-type-parser'
export { FastifyError } from '@fastify/error'
export { FastifySchema, FastifySchemaCompiler } from './types/schema'
export { HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault, ContextConfigDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './types/utils'
export * from './types/hooks'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
export { FastifyTypeProvider, FastifyTypeProviderDefault } from './types/type-provider'
export { fastify }
