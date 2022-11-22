import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { Socket } from 'net'

import { Options as AjvOptions, ValidatorCompiler } from '@fastify/ajv-compiler'
import { FastifyError } from '@fastify/error'
import { Options as FJSOptions, SerializerCompiler } from '@fastify/fast-json-stringify-compiler'
import { ConstraintStrategy, HTTPVersion } from 'find-my-way'
import { Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse, CallbackFunc as LightMyRequestCallback } from 'light-my-request'

import { FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser, getDefaultJsonParser, ProtoAction, ConstructorAction } from './types/content-type-parser'
import { FastifyContext, FastifyContextConfig } from './types/context'
import { FastifyErrorCodes } from './types/errors'
import { DoneFuncWithErrOrRes, HookHandlerDoneFunction, RequestPayload, onCloseAsyncHookHandler, onCloseHookHandler, onErrorAsyncHookHandler, onErrorHookHandler, onReadyAsyncHookHandler, onReadyHookHandler, onRegisterHookHandler, onRequestAsyncHookHandler, onRequestHookHandler, onResponseAsyncHookHandler, onResponseHookHandler, onRouteHookHandler, onSendAsyncHookHandler, onSendHookHandler, onTimeoutAsyncHookHandler, onTimeoutHookHandler, preHandlerAsyncHookHandler, preHandlerHookHandler, preParsingAsyncHookHandler, preParsingHookHandler, preSerializationAsyncHookHandler, preSerializationHookHandler, preValidationAsyncHookHandler, preValidationHookHandler } from './types/hooks'
import { FastifyListenOptions, FastifyInstance, PrintRoutesOptions } from './types/instance'
import { FastifyBaseLogger, FastifyLoggerInstance, FastifyLoggerOptions, PinoLoggerOptions, FastifyLogFn, LogLevel } from './types/logger'
import { FastifyPluginCallback, FastifyPluginAsync, FastifyPluginOptions, FastifyPlugin } from './types/plugin'
import { FastifyRegister, FastifyRegisterOptions, RegisterOptions } from './types/register'
import { FastifyReply } from './types/reply'
import { FastifyRequest, RequestGenericInterface } from './types/request'
import { RouteHandler, RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler, RouteGenericInterface } from './types/route'
import { FastifySchema, FastifySchemaCompiler, FastifySchemaValidationError } from './types/schema'
import { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './types/type-provider'
import { HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault, ContextConfigDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './types/utils'

declare module '@fastify/error' {
  interface FastifyError {
    validation?: fastify.ValidationResult[];
    validationContext?: 'body' | 'headers' | 'parameters' | 'querystring';
  }
}

type Fastify = typeof fastify

declare namespace fastify {
  export const errorCodes: FastifyErrorCodes;

  export type FastifyHttp2SecureOptions<
    Server extends http2.Http2SecureServer,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > = FastifyServerOptions<Server, Logger> & {
    http2: true,
    https: http2.SecureServerOptions,
    http2SessionTimeout?: number
  }

  export type FastifyHttp2Options<
    Server extends http2.Http2Server,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > = FastifyServerOptions<Server, Logger> & {
    http2: true,
    http2SessionTimeout?: number
  }

  export type FastifyHttpsOptions<
    Server extends https.Server,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > = FastifyServerOptions<Server, Logger> & {
    https: https.ServerOptions | null
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

  type TrustProxyFunction = (address: string, hop: number) => boolean

  /**
   * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
   */
  export type FastifyServerOptions<
    RawServer extends RawServerBase = RawServerDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
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

  export interface ValidationResult {
    keyword: string;
    instancePath: string;
    schemaPath: string;
    params: Record<string, string | string[]>;
    message?: string;
  }

  /* Export additional types */
  export type {
    LightMyRequestChain, InjectOptions, LightMyRequestResponse, LightMyRequestCallback, // 'light-my-request'
    FastifyRequest, RequestGenericInterface, // './types/request'
    FastifyReply, // './types/reply'
    FastifyPluginCallback, FastifyPluginAsync, FastifyPluginOptions, FastifyPlugin, // './types/plugin'
    FastifyListenOptions, FastifyInstance, PrintRoutesOptions, // './types/instance'
    FastifyLoggerOptions, FastifyBaseLogger, FastifyLoggerInstance, FastifyLogFn, LogLevel, // './types/logger'
    FastifyContext, FastifyContextConfig, // './types/context'
    RouteHandler, RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler, RouteGenericInterface, // './types/route'
    FastifyRegister, FastifyRegisterOptions, RegisterOptions, // './types/register'
    FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser, getDefaultJsonParser, ProtoAction, ConstructorAction, // './types/content-type-parser'
    FastifyError, // '@fastify/error'
    FastifySchema, FastifySchemaCompiler, // './types/schema'
    HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault, ContextConfigDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault, // './types/utils'
    DoneFuncWithErrOrRes, HookHandlerDoneFunction, RequestPayload, onCloseAsyncHookHandler, onCloseHookHandler, onErrorAsyncHookHandler, onErrorHookHandler, onReadyAsyncHookHandler, onReadyHookHandler, onRegisterHookHandler, onRequestAsyncHookHandler, onRequestHookHandler, onResponseAsyncHookHandler, onResponseHookHandler, onRouteHookHandler, onSendAsyncHookHandler, onSendHookHandler, onTimeoutAsyncHookHandler, onTimeoutHookHandler, preHandlerAsyncHookHandler, preHandlerHookHandler, preParsingAsyncHookHandler, preParsingHookHandler, preSerializationAsyncHookHandler, preSerializationHookHandler, preValidationAsyncHookHandler, preValidationHookHandler, // './types/hooks'
    FastifyServerFactory, FastifyServerFactoryHandler, // './types/serverFactory'
    FastifyTypeProvider, FastifyTypeProviderDefault, // './types/type-provider'
    FastifyErrorCodes, // './types/errors'
  }
  // named export
  // import { plugin } from 'plugin'
  // const { plugin } = require('plugin')
  export const fastify: Fastify
  // default export
  // import plugin from 'plugin'
  export { fastify as default }
}

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
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: fastify.FastifyHttp2SecureOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: fastify.FastifyHttp2Options<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts: fastify.FastifyHttpsOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

declare function fastify<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
>(opts?: fastify.FastifyServerOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger, TypeProvider>>

// CJS export
// const fastify = require('fastify')
export = fastify
