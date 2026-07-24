import * as http from 'node:http'
import * as http2 from 'node:http2'
import * as https from 'node:https'

import { FastifyError } from '@fastify/error'
import { InjectOptions, CallbackFunc as LightMyRequestCallback, Chain as LightMyRequestChain, Response as LightMyRequestResponse } from 'light-my-request'

import {
  AddContentTypeParser,
  ConstructorAction,
  FastifyBodyParser,
  FastifyContentTypeParser,
  getDefaultJsonParser,
  hasContentTypeParser,
  ProtoAction
} from './types/content-type-parser'
import { FastifyContextConfig, FastifyReplyContext, FastifyRequestContext } from './types/context'
import { FastifyErrorCodes } from './types/errors'
import {
  DoneFuncWithErrOrRes,
  HookHandlerDoneFunction,
  onCloseAsyncHookHandler,
  onCloseHookHandler,
  onErrorAsyncHookHandler,
  onErrorHookHandler,
  onListenAsyncHookHandler,
  onListenHookHandler,
  onReadyAsyncHookHandler,
  onReadyHookHandler,
  onRegisterHookHandler,
  onRequestAbortAsyncHookHandler,
  onRequestAbortHookHandler,
  onRequestAsyncHookHandler,
  onRequestHookHandler,
  onResponseAsyncHookHandler,
  onResponseHookHandler,
  onRouteHookHandler,
  onSendAsyncHookHandler,
  onSendHookHandler,
  onTimeoutAsyncHookHandler,
  onTimeoutHookHandler,
  preCloseAsyncHookHandler,
  preCloseHookHandler,
  preHandlerAsyncHookHandler,
  preHandlerHookHandler,
  preParsingAsyncHookHandler,
  preParsingHookHandler,
  preSerializationAsyncHookHandler,
  preSerializationHookHandler,
  preValidationAsyncHookHandler,
  preValidationHookHandler,
  RequestPayload
} from './types/hooks'
import { FastifyInstance, FastifyListenOptions, PrintRoutesOptions } from './types/instance'
import {
  FastifyBaseLogger,
  FastifyChildLoggerFactory,
  LogController as LogControllerClass,
  FastifyLogFn,
  FastifyLoggerInstance,
  FastifyLoggerOptions,
  LogLevel
} from './types/logger'
import { FastifyPlugin, FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions } from './types/plugin'
import { FastifyRegister, FastifyRegisterOptions, RegisterOptions } from './types/register'
import { FastifyReply } from './types/reply'
import { FastifyRequest, RequestGenericInterface } from './types/request'
import { FastifyRouterOptions } from './types/router-options'
import {
  RouteGenericInterface,
  RouteHandler,
  RouteHandlerMethod,
  RouteOptions,
  RouteShorthandMethod,
  RouteShorthandOptions,
  RouteShorthandOptionsWithHandler
} from './types/route'
import {
  FastifySchema,
  FastifySchemaCompiler,
  FastifySchemaValidationError,
  FastifySerializerCompiler,
  SchemaErrorDataVar,
  SchemaErrorFormatter
} from './types/schema'
import { FastifyServerFactory, FastifyServerFactoryHandler } from './types/server-factory'
import {
  ConnectionError,
  FastifyHttp2Options,
  FastifyHttp2SecureOptions,
  FastifyHttpOptions,
  FastifyHttpsOptions,
  FastifyServerOptions
} from './types/server-options'
import { FastifyTypeProvider, FastifyTypeProviderDefault, SafePromiseLike } from './types/type-provider'
import {
  ContextConfigDefault,
  HTTPMethods,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault,
  RequestBodyDefault,
  RequestHeadersDefault,
  RequestParamsDefault,
  RequestQuerystringDefault
} from './types/utils'

declare module '@fastify/error' {
  interface FastifyError {
    validationContext?: SchemaErrorDataVar
    validation?: FastifySchemaValidationError[]
  }
}

type Fastify = typeof fastify

type FastifyFactoryResult<
  Server extends RawServerBase,
  Request extends RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider
> = FastifyInstance<Server, Request, Reply, Logger, TypeProvider> & SafePromiseLike<FastifyInstance<Server, Request,
  Reply, Logger, TypeProvider>>

declare namespace fastify {
  export const errorCodes: FastifyErrorCodes
  export { LogControllerClass as LogController }

  /**
   * @deprecated use {@link FastifySchemaValidationError}
   */
  export type ValidationResult = FastifySchemaValidationError

  /* Export additional types */
  export type {
    LightMyRequestChain,
    InjectOptions,
    LightMyRequestResponse,
    LightMyRequestCallback, // 'light-my-request'
    FastifyRequest,
    RequestGenericInterface, // './types/request'
    FastifyReply, // './types/reply'
    FastifyPluginCallback,
    FastifyPluginAsync,
    FastifyPluginOptions,
    FastifyPlugin, // './types/plugin'
    FastifyListenOptions,
    FastifyInstance,
    PrintRoutesOptions, // './types/instance'
    FastifyRouterOptions, // './types/router-options'
    FastifyLoggerOptions,
    FastifyBaseLogger,
    FastifyChildLoggerFactory,
    FastifyLoggerInstance,
    FastifyLogFn,
    LogLevel, // './types/logger'
    FastifyRequestContext,
    FastifyContextConfig,
    FastifyReplyContext, // './types/context'
    RouteHandler,
    RouteHandlerMethod,
    RouteOptions,
    RouteShorthandMethod,
    RouteShorthandOptions,
    RouteShorthandOptionsWithHandler,
    RouteGenericInterface, // './types/route'
    FastifyRegister,
    FastifyRegisterOptions,
    RegisterOptions, // './types/register'
    FastifyBodyParser,
    FastifyContentTypeParser,
    AddContentTypeParser,
    hasContentTypeParser,
    getDefaultJsonParser,
    ProtoAction,
    ConstructorAction, // './types/content-type-parser'
    FastifyError, // '@fastify/error'
    FastifySchema,
    FastifySchemaValidationError,
    FastifySchemaCompiler,
    FastifySerializerCompiler,
    SchemaErrorDataVar,
    SchemaErrorFormatter, // './types/schema'
    HTTPMethods,
    RawServerBase,
    RawRequestDefaultExpression,
    RawReplyDefaultExpression,
    RawServerDefault,
    ContextConfigDefault,
    RequestBodyDefault,
    RequestQuerystringDefault,
    RequestParamsDefault,
    RequestHeadersDefault, // './types/utils'
    DoneFuncWithErrOrRes,
    HookHandlerDoneFunction,
    RequestPayload,
    onCloseAsyncHookHandler,
    onCloseHookHandler,
    onErrorAsyncHookHandler,
    onErrorHookHandler,
    onReadyAsyncHookHandler,
    onReadyHookHandler,
    onListenAsyncHookHandler,
    onListenHookHandler,
    onRegisterHookHandler,
    onRequestAsyncHookHandler,
    onRequestHookHandler,
    onResponseAsyncHookHandler,
    onResponseHookHandler,
    onRouteHookHandler,
    onSendAsyncHookHandler,
    onSendHookHandler,
    onTimeoutAsyncHookHandler,
    onTimeoutHookHandler,
    preHandlerAsyncHookHandler,
    preHandlerHookHandler,
    preParsingAsyncHookHandler,
    preParsingHookHandler,
    preSerializationAsyncHookHandler,
    preSerializationHookHandler,
    preValidationAsyncHookHandler,
    preValidationHookHandler,
    onRequestAbortHookHandler,
    onRequestAbortAsyncHookHandler,
    preCloseAsyncHookHandler,
    preCloseHookHandler, // './types/hooks'
    FastifyServerFactory,
    FastifyServerFactoryHandler, // './types/serverFactory'
    ConnectionError,
    FastifyHttp2Options,
    FastifyHttp2SecureOptions,
    FastifyHttpOptions,
    FastifyHttpsOptions,
    FastifyServerOptions, // './types/server-options'
    FastifyTypeProvider,
    FastifyTypeProviderDefault,
    SafePromiseLike, // './types/type-provider'
    FastifyErrorCodes // './types/errors'
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
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> (opts: fastify.FastifyHttp2SecureOptions<Server, Logger, Request, Reply, TypeProvider>): FastifyFactoryResult<Server,
  Request, Reply, Logger, TypeProvider>

declare function fastify<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> (opts: fastify.FastifyHttp2Options<Server, Logger, Request, Reply, TypeProvider>): FastifyFactoryResult<Server,
  Request, Reply, Logger, TypeProvider>

declare function fastify<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> (opts: fastify.FastifyHttpsOptions<Server, Logger, Request, Reply, TypeProvider>): FastifyFactoryResult<Server,
  Request, Reply, Logger, TypeProvider>

declare function fastify<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> (opts?: fastify.FastifyHttpOptions<Server, Logger, Request, Reply, TypeProvider>): FastifyFactoryResult<Server,
  Request, Reply, Logger, TypeProvider>

// CJS export
// const fastify = require('fastify')
export = fastify
