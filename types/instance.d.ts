import { ConstructorAction, ProtoAction } from './content-type-parser'
import { preHandlerAsyncHookHandler, preHandlerHookHandler, preValidationAsyncHookHandler, preValidationHookHandler } from './hooks'
import { FastifyBaseLogger, FastifyChildLoggerFactory } from './logger'
import { FastifyInstanceCore } from './instance-core'
import { FastifyInstanceDecorators } from './instance-decorators'
import { FastifyInstanceHooks } from './instance-hooks'
import { FastifyInstanceLifecycle } from './instance-lifecycle'
import { FastifyInstanceRouting } from './instance-routing'
import { FastifyInstanceSchema } from './instance-schema'
import { FastifyRegister } from './register'
import { FastifyReply, FastifyReplyForRoute } from './reply'
import { FastifyRequest, FastifyRequestForRoute } from './request'
import { FastifyRouterOptions } from './router-options'
import { RouteGenericInterface, RouteHandlerMethod } from './route'
import { FastifySchema } from './schema'
import { FastifyTypeProvider, FastifyTypeProviderDefault, SafePromiseLike } from './type-provider'
import { FastifyTypeContextOf } from './type-context'
import { ContextConfigDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from './utils'

export type { FindMyWayVersion } from './router-options'
export type { FindMyWayFindResult, PrintRoutesOptions } from './instance-routing'
export type { FastifyListenOptions } from './instance-lifecycle'

/** Historical error-handler return escape hatch; the runtime ignores it. */
type ErrorHandlerResult = any | Promise<any>

/**
 * Fastify server instance. Returned by the core `fastify()` method.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> extends FastifyInstanceCore<
      FastifyTypeContextOf<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >,
  FastifyInstanceDecorators<FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>, FastifyRequest,
    FastifyReply>,
  FastifyInstanceHooks<FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>, RawServer, RawRequest,
    RawReply, Logger, TypeProvider>,
  FastifyInstanceLifecycle,
  FastifyInstanceRouting<
      FastifyTypeContextOf<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >,
  FastifyInstanceSchema<
      FastifyTypeContextOf<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    > {
  withTypeProvider<Provider extends FastifyTypeProvider>(): FastifyInstance<RawServer, RawRequest, RawReply, Logger,
    Provider>

  register: FastifyRegister<
    FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> & SafePromiseLike<undefined>
  >

  /**
   * Set the 404 handler
   */
  setNotFoundHandler<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig extends ContextConfigDefault = ContextConfigDefault,
    HandlerTypeProvider extends FastifyTypeProvider = TypeProvider,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
      HandlerTypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  setNotFoundHandler<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig extends ContextConfigDefault = ContextConfigDefault,
    HandlerTypeProvider extends FastifyTypeProvider = TypeProvider,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(
    opts: {
      preValidation?:
        | preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preValidationAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[]
          | preValidationAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[]
      preHandler?:
        | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[]
          | preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[]
    },
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
      HandlerTypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Fastify default error handler
   */
  errorHandler: <TError = unknown>(error: TError, request: FastifyRequest, reply: FastifyReply) => void

  /**
   * Set a function that will be invoked whenever an exception is thrown during the request lifecycle.
   */
  setErrorHandler<
    TError = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HandlerTypeProvider extends FastifyTypeProvider = TypeProvider
  >(
    handler: (
      this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, HandlerTypeProvider>,
      error: TError,
      request: FastifyRequestForRoute<RouteGeneric, RawServer, RawRequest, RawReply, SchemaCompiler,
        HandlerTypeProvider, ContextConfigDefault, Logger>,
      reply: FastifyReplyForRoute<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfigDefault, SchemaCompiler,
        HandlerTypeProvider, Logger>
    ) => ErrorHandlerResult
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Set a function that will generate a request-ids
   */
  setGenReqId(fn: (req: RawRequest) => string): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Hook function that is called when creating a child logger instance for each request
   * which allows for modifying or adding child logger bindings and logger options, or
   * returning a completely custom child logger implementation.
   */
  childLoggerFactory: FastifyChildLoggerFactory<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Hook function that is called when creating a child logger instance for each request
   * which allows for modifying or adding child logger bindings and logger options, or
   * returning a completely custom child logger implementation.
   *
   * Child logger bindings have a performance advantage over per-log bindings, because
   * they are pre-serialised by Pino when the child logger is created.
   *
   * For example:
   * ```
   * function childLoggerFactory(logger, bindings, opts, rawReq) {
   *   // Calculate additional bindings from the request
   *   bindings.traceContext = rawReq.headers['x-cloud-trace-context']
   *   return logger.child(bindings, opts);
   * }
   * ```
   */
  setChildLoggerFactory(
    factory: FastifyChildLoggerFactory<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Prints the representation of the plugin tree used by avvio, the plugin registration system
   */
  printPlugins(): string

  /**
   *  Frozen read-only object registering the initial options passed down by the user to the fastify instance
   */
  initialConfig: Readonly<{
    connectionTimeout?: number
    keepAliveTimeout?: number
    forceCloseConnections?: boolean
    bodyLimit?: number
    caseSensitive?: boolean
    allowUnsafeRegex?: boolean
    http2?: boolean
    https?: boolean | Readonly<{ allowHTTP1: boolean }>
    ignoreTrailingSlash?: boolean
    ignoreDuplicateSlashes?: boolean
    /** @deprecated Use the `logController` option with `disableRequestLogging` or `isLogDisabled` override instead. Will be removed in `fastify@6`. */
    disableRequestLogging?: boolean | ((req: FastifyRequest) => boolean)
    maxParamLength?: number
    onProtoPoisoning?: ProtoAction
    onConstructorPoisoning?: ConstructorAction
    pluginTimeout?: number
    requestIdHeader?: string | false
    /** @deprecated Use the `logController` option with `requestIdLogLabel` instead. Will be removed in `fastify@6`. */
    requestIdLogLabel?: string
    http2SessionTimeout?: number
    useSemicolonDelimiter?: boolean
    routerOptions?: FastifyRouterOptions<RawServer>
  }>
}
