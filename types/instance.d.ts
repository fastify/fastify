import { AddressInfo } from 'node:net'
import { ConstraintStrategy } from 'find-my-way'
import {
  CallbackFunc as LightMyRequestCallback,
  Chain as LightMyRequestChain,
  InjectOptions,
  Response as LightMyRequestResponse
} from 'light-my-request'
import {
  AddContentTypeParser,
  ConstructorAction,
  FastifyBodyParser,
  ProtoAction,
  getDefaultJsonParser,
  hasContentTypeParser,
  removeAllContentTypeParsers,
  removeContentTypeParser
} from './content-type-parser'
import { preHandlerAsyncHookHandler, preHandlerHookHandler, preValidationAsyncHookHandler, preValidationHookHandler } from './hooks'
import { FastifyBaseLogger, FastifyChildLoggerFactory } from './logger'
import { FastifyInstanceHooks } from './instance-hooks'
import { FastifyRegister } from './register'
import { FastifyReply, FastifyReplyForRoute } from './reply'
import { FastifyRequest, FastifyRequestForRoute } from './request'
import {
  FastifyRouterOptions,
  FindMyWayFindResult,
  FindMyWayVersion,
  PrintRoutesOptions,
  RouteGenericInterface,
  RouteHandlerMethod,
  RouteOptions,
  RouteShorthandMethod
} from './route'
import {
  FastifySchema,
  FastifySchemaCompiler,
  FastifySchemaControllerOptions,
  FastifySerializerCompiler,
  SchemaErrorFormatter
} from './schema'
import {
  FastifyTypeProvider,
  FastifyTypeProviderDefault,
  SafePromiseLike
} from './type-provider'
import {
  AnyFunction,
  ContextConfigDefault,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault
} from './utils'

export type { FindMyWayFindResult, FindMyWayVersion, PrintRoutesOptions } from './route'

export interface FastifyListenOptions {
  /** Default to `0` (picks the first available open port). */
  port?: number
  /** Default to `localhost`. */
  host?: string
  /** Ignored when `port` is specified. */
  path?: string
  /** Default to `511`. */
  backlog?: number
  exclusive?: boolean
  /** Makes an IPC pipe readable for all users. */
  readableAll?: boolean
  /** Makes an IPC pipe writable for all users. */
  writableAll?: boolean
  /** Disable dual-stack behavior for an IPv6 TCP server. */
  ipv6Only?: boolean
  /** Close the listening server when this signal is aborted. */
  signal?: AbortSignal
  /** Resolves the text logged after the server starts. */
  listenTextResolver?: (address: string) => string
}

type ErrorHandlerResult = any | Promise<any>

type GetterSetter<This, Value> = Value | {
  getter: (this: This) => Value,
  setter?: (this: This, value: Value) => void
}

type DecorationMethod<This, Instance, Return = Instance> = {
  <
    // Keep the historical generic order: decorate<Foo>() must retain its meaning.
    Value extends (Property extends keyof This ? This[Property] : unknown),
    Property extends string | symbol = string | symbol
  >(
    property: Property,
    value: GetterSetter<This, Value extends AnyFunction
      ? (this: This, ...args: Parameters<Value>) => ReturnType<Value>
      : Value
    >,
    dependencies?: string[]
  ): Return

  (property: string | symbol): Return
  (property: string | symbol, value: null | undefined, dependencies: string[]): Return
}

/**
 * Fastify server instance. Returned by the core `fastify()` method.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> extends FastifyInstanceHooks<FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>, RawServer,
    RawRequest, RawReply, Logger, TypeProvider> {
  server: RawServer
  pluginName: string
  prefix: string
  version: string
  log: Logger
  listeningOrigin: string
  addresses(): AddressInfo[]

  addSchema(schema: unknown): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  getSchema(schemaId: string): unknown
  getSchemas(): Record<string, unknown>

  after(): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> & SafePromiseLike<undefined>
  after(afterListener: (err: Error | null) => void): FastifyInstance<RawServer, RawRequest, RawReply, Logger,
    TypeProvider>

  close(): Promise<undefined>
  close(closeListener: () => void): undefined

  /** Alias for `close()`. */
  // @ts-ignore - type only available for @types/node >=17 or TypeScript >=5.2
  [Symbol.asyncDispose](): Promise<undefined>

  ready(): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> & SafePromiseLike<undefined>
  ready(readyListener: (err: Error | null) => void | Promise<void>): FastifyInstance<RawServer, RawRequest, RawReply,
    Logger, TypeProvider>

  withTypeProvider<Provider extends FastifyTypeProvider>(): FastifyInstance<RawServer, RawRequest, RawReply, Logger,
    Provider>;

  register: FastifyRegister<FastifyInstance<RawServer, RawRequest, RawReply, Logger,
    TypeProvider> & SafePromiseLike<undefined>>;

  decorate: DecorationMethod<FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
    FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>>
  decorateRequest: DecorationMethod<FastifyRequest, FastifyInstance<RawServer, RawRequest, RawReply, Logger,
    TypeProvider>>
  decorateReply: DecorationMethod<FastifyReply, FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>>
  getDecorator<Value>(name: string | symbol): Value
  hasDecorator(decorator: string | symbol): boolean
  hasRequestDecorator(decorator: string | symbol): boolean
  hasReplyDecorator(decorator: string | symbol): boolean
  hasPlugin(name: string): boolean

  addConstraintStrategy(strategy: ConstraintStrategy<FindMyWayVersion<RawServer>, unknown>): void
  hasConstraintStrategy(strategyName: string): boolean
  routing(req: RawRequest, res: RawReply): void

  route<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    const SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: RouteOptions<
    RawServer,
    RawRequest,
    RawReply,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    TypeProvider,
    Logger
  >): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  delete: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  get: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  head: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  patch: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  post: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  put: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  options: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  propfind: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  proppatch: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  mkcalendar: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  mkcol: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  copy: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  move: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  lock: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  unlock: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  trace: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  report: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  search: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  query: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  all: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>
  hasRoute<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: Pick<RouteOptions<
    RawServer,
    RawRequest,
    RawReply,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    TypeProvider
  >, 'method' | 'url' | 'constraints'>): boolean
  findRoute<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema
  >(opts: Pick<RouteOptions<
    RawServer,
    RawRequest,
    RawReply,
    RouteGeneric,
    ContextConfig,
    SchemaCompiler,
    TypeProvider
  >, 'method' | 'url' | 'constraints'>): Omit<FindMyWayFindResult<RawServer>, 'store'>
  supportedMethods: string[]
  addHttpMethod(
    method: string,
    methodOptions?: {
      hasBody?: boolean
      overrideExisting?: boolean
    }
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  printRoutes(opts?: PrintRoutesOptions): string

  inject(opts: InjectOptions | string, cb: LightMyRequestCallback): void
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>
  inject(): LightMyRequestChain
  listen(
    opts: FastifyListenOptions,
    callback: (err: Error | null, address: string) => void
  ): void
  listen(opts?: FastifyListenOptions): Promise<string>
  listen(callback: (err: Error | null, address: string) => void): void

  validatorCompiler: FastifySchemaCompiler<any> | undefined
  setValidatorCompiler<Schema = FastifySchema>(
    schemaCompiler: FastifySchemaCompiler<Schema>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  serializerCompiler: FastifySerializerCompiler<any> | undefined
  setSerializerCompiler<Schema = FastifySchema>(
    schemaCompiler: FastifySerializerCompiler<Schema>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  setSchemaController(
    schemaControllerOpts: FastifySchemaControllerOptions
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  setReplySerializer(
    replySerializer: (payload: unknown, statusCode: number) => string
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
  setSchemaErrorFormatter(
    errorFormatter: SchemaErrorFormatter
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  addContentTypeParser: AddContentTypeParser<RawServer, RawRequest, RouteGenericInterface, FastifySchema, TypeProvider>
  hasContentTypeParser: hasContentTypeParser
  removeContentTypeParser: removeContentTypeParser
  removeAllContentTypeParsers: removeAllContentTypeParsers
  getDefaultJsonParser: getDefaultJsonParser
  defaultTextParser: FastifyBodyParser<string>

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
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;

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
          HandlerTypeProvider, Logger>[];
      preHandler?:
        | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>
          | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[]
          | preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          HandlerTypeProvider, Logger>[];
    },
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
      HandlerTypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>

  /**
   * Fastify default error handler
   */
  errorHandler: <TError = unknown>(error: TError, request: FastifyRequest, reply: FastifyReply) => void;

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
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;

  /**
   * Set a function that will generate a request-ids
   */
  setGenReqId(fn: (req: RawRequest) => string): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;

  /**
   * Hook function that is called when creating a child logger instance for each request
   * which allows for modifying or adding child logger bindings and logger options, or
   * returning a completely custom child logger implementation.
   */
  childLoggerFactory: FastifyChildLoggerFactory<RawServer, RawRequest, RawReply, Logger, TypeProvider>;

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
  setChildLoggerFactory(factory: FastifyChildLoggerFactory<RawServer, RawRequest, RawReply, Logger,
    TypeProvider>): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;

  /**
   * Prints the representation of the plugin tree used by avvio, the plugin registration system
   */
  printPlugins(): string;

  /**
   *  Frozen read-only object registering the initial options passed down by the user to the fastify instance
   */
  initialConfig: Readonly<{
    connectionTimeout?: number,
    keepAliveTimeout?: number,
    forceCloseConnections?: boolean,
    bodyLimit?: number,
    caseSensitive?: boolean,
    allowUnsafeRegex?: boolean,
    http2?: boolean,
    https?: boolean | Readonly<{ allowHTTP1: boolean }>,
    ignoreTrailingSlash?: boolean,
    ignoreDuplicateSlashes?: boolean,
    /** @deprecated Use the `logController` option with `disableRequestLogging` or `isLogDisabled` override instead. Will be removed in `fastify@6`. */
    disableRequestLogging?: boolean | ((req: FastifyRequest) => boolean),
    maxParamLength?: number,
    onProtoPoisoning?: ProtoAction,
    onConstructorPoisoning?: ConstructorAction,
    pluginTimeout?: number,
    requestIdHeader?: string | false,
    /** @deprecated Use the `logController` option with `requestIdLogLabel` instead. Will be removed in `fastify@6`. */
    requestIdLogLabel?: string,
    http2SessionTimeout?: number,
    useSemicolonDelimiter?: boolean,
    routerOptions?: FastifyRouterOptions<RawServer>
  }>
}
