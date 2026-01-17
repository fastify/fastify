import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { FastifySchema } from './schema'
import { RouteGenericInterface } from './route'
import {
  onRequestHookHandler,
  onRequestAsyncHookHandler,
  onSendHookHandler,
  onSendAsyncHookHandler,
  onResponseHookHandler,
  onResponseAsyncHookHandler,
  onErrorHookHandler,
  onErrorAsyncHookHandler
} from './hooks'

/**
 * Context object passed to web route handlers
 */
export interface WebRouteContext<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> {
  log: Logger
  server: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
}

/**
 * Web Standard API route handler that receives a Request and returns a Response.
 * The handler is bound to the FastifyInstance (available as `this`).
 */
export type WebRouteHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
  request: Request,
  ctx: WebRouteContext<RawServer, RawRequest, RawReply, Logger, TypeProvider>
) => Response | Promise<Response>

/**
 * Options for Web Standard API routes
 */
export interface WebRouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger
> {
  config?: Record<string, unknown>
  logLevel?: string
  logSerializers?: Record<string, (value: unknown) => unknown>
  constraints?: Record<string, unknown>
  errorHandler?: (
    error: Error,
    request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig, Logger>,
    reply: FastifyReply<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider>
  ) => void | Promise<void>
  onRequest?:
    | onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | onRequestAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | Array<
        | onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
        | onRequestAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
      >
  onSend?:
    | onSendHookHandler<Response, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | onSendAsyncHookHandler<Response, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | Array<
        | onSendHookHandler<Response, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
        | onSendAsyncHookHandler<Response, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
      >
  onResponse?:
    | onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | onResponseAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    | Array<
        | onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
        | onResponseAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
      >
  onError?:
    | onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, Error, SchemaCompiler, TypeProvider, Logger>
    | onErrorAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, Error, SchemaCompiler, TypeProvider, Logger>
    | Array<
        | onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, Error, SchemaCompiler, TypeProvider, Logger>
        | onErrorAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, Error, SchemaCompiler, TypeProvider, Logger>
      >
}

/**
 * Web Standard API route shorthand method signature
 */
export interface WebRouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger
> {
  (
    path: string,
    handler: WebRouteHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  (
    path: string,
    opts: WebRouteShorthandOptions<RawServer, RawRequest, RawReply>,
    handler: WebRouteHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
}

/**
 * Web Standard API namespace containing route shorthand methods
 */
export interface FastifyWebNamespace<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger
> {
  delete: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  get: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  head: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  patch: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  post: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  put: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  options: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  trace: WebRouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
}
