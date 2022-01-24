import { FastifyError } from 'fastify-error'
import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { CallbackFunc as LightMyRequestCallback, Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
import { AddContentTypeParser, ConstructorAction, FastifyBodyParser, GetDefaultJsonParser, HasContentTypeParser, ProtoAction, RemoveAllContentTypeParsers, RemoveContentTypeParser } from './content-type-parser'
import { onCloseAsyncHookHandler, onCloseHookHandler, onErrorAsyncHookHandler, onErrorHookHandler, onReadyAsyncHookHandler, onReadyHookHandler, onRegisterHookHandler, onRequestAsyncHookHandler, onRequestHookHandler, onResponseAsyncHookHandler, onResponseHookHandler, onRouteHookHandler, onSendAsyncHookHandler, onSendHookHandler, onTimeoutAsyncHookHandler, onTimeoutHookHandler, preHandlerAsyncHookHandler, preHandlerHookHandler, preParsingAsyncHookHandler, preParsingHookHandler, preSerializationAsyncHookHandler, preSerializationHookHandler, preValidationAsyncHookHandler, preValidationHookHandler } from './hooks'
import { FastifyLoggerInstance } from './logger'
import { PrintRoutesOptions } from './option'
import { FastifyRegister } from './register'
import { FastifyReply } from './reply'
import { FastifyRequest } from './request'
import { DefaultFastifyInstanceRouteGenericOnlyInterface, DefaultRoute, FastifyInstanceRouteGenericInterface, FastifyInstanceRouteGenericOnlyInterface, RouteOptions, RouteShorthandMethod } from './route'
import { FastifySchema, FastifySchemaValidationError, FastifySerializerCompiler, FastifyValidatorCompiler } from './schema'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { GetLogger, GetReply, GetRequest, GetServer } from './utils'

export interface FastifyInstanceGenericInterface {
  Server?: http2.Http2SecureServer | http2.Http2Server | https.Server | http.Server
  Request?: http2.Http2ServerRequest | http.IncomingMessage
  Reply?: http2.Http2ServerResponse | http.ServerResponse
  Logger?: unknown
  TypeProvider?: FastifyTypeProvider
}

export interface DefaultFastifyInstanceGenericInterface {
  Server: http.Server,
  Request: http.IncomingMessage,
  Reply: http.ServerResponse,
  Logger: FastifyLoggerInstance,
  TypeProvider: FastifyTypeProviderDefault
}

export interface FastifyInstanceHttp2SecureGenericInterface extends FastifyInstanceGenericInterface {
  Server: http2.Http2SecureServer
  Request: http2.Http2ServerRequest
  Reply: http2.Http2ServerResponse
}

export interface FastifyInstanceHttp2GenericInterface extends FastifyInstanceGenericInterface {
  Server: http2.Http2Server
  Request: http2.Http2ServerRequest
  Reply: http2.Http2ServerResponse
}

export interface FastifyInstanceHttpsGenericInterface extends FastifyInstanceGenericInterface {
  Server: https.Server
  Request: http.IncomingMessage
  Reply: http.ServerResponse
}

export interface FastifyInstanceHttpGenericInterface extends FastifyInstanceGenericInterface {
  Server: http.Server
  Request: http.IncomingMessage
  Reply: http.ServerResponse
}

export interface FastifyInstance<Generic extends FastifyInstanceGenericInterface = DefaultFastifyInstanceGenericInterface> {
  server: GetServer<Generic>
  prefix: string
  version: string
  log: GetLogger<Generic>

  withTypeProvider<Provider extends FastifyTypeProvider>(): FastifyInstance<Generic & { TypeProvider: Provider }>;

  addSchema(schema: unknown): this;
  getSchema(schemaId: string): unknown;
  getSchemas(): Record<string, unknown>;

  after(): this & PromiseLike<undefined>;
  after(afterListener: (err: Error) => void): this;

  close(): Promise<undefined>;
  close(closeListener: () => void): undefined;

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enforce the users function returns what they expect it to
  decorate<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: this, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  decorateRequest<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: any, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  decorateReply<T>(property: string | symbol,
    value: T extends (...args: any[]) => any
      ? (this: any, ...args: Parameters<T>) => ReturnType<T>
      : T,
    dependencies?: string[]
  ): this;

  hasDecorator(decorator: string | symbol): boolean;
  hasRequestDecorator(decorator: string | symbol): boolean;
  hasReplyDecorator(decorator: string | symbol): boolean;

  inject(opts: InjectOptions | string, cb: LightMyRequestCallback): void;
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  inject(): LightMyRequestChain;

  listen(port: number | string, address: string, backlog: number, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, address: string, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, callback: (err: Error|null, address: string) => void): void;
  listen(port: number | string, address?: string, backlog?: number): Promise<string>;
  listen(opts: { port: number; host?: string; backlog?: number }, callback: (err: Error|null, address: string) => void): void;
  listen(opts: { port: number; host?: string; backlog?: number }): Promise<string>;

  ready(): this & PromiseLike<undefined>;
  ready(readyListener: (err: Error) => void): this;

  register: FastifyRegister<this & PromiseLike<undefined>>;

  routing(request: GetRequest<Generic>, reply: GetReply<Generic>): void;
  getDefaultRoute: DefaultRoute<GetRequest<Generic>, GetReply<Generic>>;
  setDefaultRoute(defaultRoute: DefaultRoute<GetRequest<Generic>, GetReply<Generic>>): void;

  route<
    RouteGeneric extends FastifyInstanceRouteGenericInterface = Generic
  >(opts: RouteOptions<RouteGeneric>): this;

  get: RouteShorthandMethod<Generic>;
  head: RouteShorthandMethod<Generic>;
  post: RouteShorthandMethod<Generic>;
  put: RouteShorthandMethod<Generic>;
  delete: RouteShorthandMethod<Generic>;
  options: RouteShorthandMethod<Generic>;
  patch: RouteShorthandMethod<Generic>;
  all: RouteShorthandMethod<Generic>;

  // addHook: overloads

  // Lifecycle addHooks

  /**
   * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
   *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onRequest',
    hook: onRequestHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onRequest',
    hook: onRequestAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
    * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preParsing',
    hook: preParsingHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preParsing',
    hook: preParsingAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preValidation',
    hook: preValidationHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preValidation',
    hook: preValidationAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preHandler',
    hook: preHandlerHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preHandler',
    hook: preHandlerAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
    *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
    */
  addHook<
    PreSerializationPayload = unknown,
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preSerialization',
    hook: preSerializationHookHandler<PreSerializationPayload, Generic & RouteGeneric>
  ): this;

  addHook<
    PreSerializationPayload = unknown,
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'preSerialization',
    hook: preSerializationAsyncHookHandler<PreSerializationPayload, Generic & RouteGeneric>
  ): this;

  /**
    * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
    * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
    */
  addHook<
    OnSendPayload = unknown,
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onSend',
    hook: onSendHookHandler<OnSendPayload, Generic & RouteGeneric>
  ): this;

  addHook<
    OnSendPayload = unknown,
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onSend',
    hook: onSendAsyncHookHandler<OnSendPayload, Generic & RouteGeneric>
  ): this;

  /**
    * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
    * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onResponse',
    hook: onResponseHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onResponse',
    hook: onResponseAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * `onTimeout` is useful if you need to monitor the request timed out in your service. (if the `connectionTimeout` property is set on the fastify instance)
    * The onTimeout hook is executed when a request is timed out and the http socket has been hanged up. Therefore you will not be able to send data to the client.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onTimeout',
    hook: onTimeoutHookHandler<Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onTimeout',
    hook: onTimeoutAsyncHookHandler<Generic & RouteGeneric>
  ): this;

  /**
    * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
    * It is not intended for changing the error, and calling reply.send will throw an exception.
    * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
    * Notice: unlike the other hooks, pass an error to the done function is not supported.
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onError',
    hook: onErrorHookHandler<FastifyError, Generic & RouteGeneric>
  ): this;

  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onError',
    hook: onErrorAsyncHookHandler<FastifyError, Generic & RouteGeneric>
  ): this;

  // Application addHooks

  /**
    * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
    */
  addHook<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    name: 'onRoute',
    hook: onRouteHookHandler<Generic & RouteGeneric>
  ): this;

  /**
   * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
   * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
   * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
   */
  addHook(
    name: 'onRegister',
    hook: onRegisterHookHandler<Generic>
  ): this;

  /**
   * Triggered when fastify.listen() or fastify.ready() is invoked to start the server. It is useful when plugins need a "ready" event, for example to load data before the server start listening for requests.
   */
  addHook(
    name: 'onReady',
    hook: onReadyHookHandler
  ): this;

  addHook(
    name: 'onReady',
    hook: onReadyAsyncHookHandler,
  ): this;

  /**
   * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
   */
  addHook(
    name: 'onClose',
    hook: onCloseHookHandler<Generic>
  ): this;

  addHook(
    name: 'onClose',
    hook: onCloseAsyncHookHandler<Generic>
  ): FastifyInstance<Generic>;

  /**
    * Set the 404 handler
    */
  setNotFoundHandler<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  > (
    handler: (request: FastifyRequest<Generic & RouteGeneric>, reply: FastifyReply<Generic & RouteGeneric>) => void
  ): this;

  setNotFoundHandler<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  > (
    opts: {
      preValidation?: preValidationHookHandler<Generic & RouteGeneric> | preValidationHookHandler<Generic & RouteGeneric>[];
      preHandler?: preHandlerHookHandler<Generic & RouteGeneric> | preHandlerHookHandler<Generic & RouteGeneric>[];
    },
    handler: (request: FastifyRequest<Generic & RouteGeneric>, reply: FastifyReply<Generic & RouteGeneric>) => void
  ): this

  /**
   * Set the 404 handler
   */
  setNotFoundHandler<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  > (
    handler: (request: FastifyRequest<Generic & RouteGeneric>, reply: FastifyReply<Generic & RouteGeneric>) => void
  ): this;

  setNotFoundHandler<
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  > (
    opts: {
      preValidation?: preValidationHookHandler<Generic & RouteGeneric> | preValidationHookHandler<Generic & RouteGeneric>[];
      preHandler?: preHandlerHookHandler<Generic & RouteGeneric> | preHandlerHookHandler<Generic & RouteGeneric>[];
    },
    handler: (request: FastifyRequest<Generic & RouteGeneric>, reply: FastifyReply<Generic & RouteGeneric>) => void
  ): this

  /**
   * Fastify default error handler
   */
  errorHandler: (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;

  /**
   * Set a function that will be called whenever an error happens
   */
  setErrorHandler<
    TError extends Error = FastifyError,
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    handler: (this: this, error: TError, request: FastifyRequest<Generic & RouteGeneric>, reply: FastifyReply<Generic & RouteGeneric>) => any | Promise<any>
  ): this;

  /**
   * Set the schema validator for all routes.
   */
  setValidatorCompiler<Schema = FastifySchema>(schemaCompiler: FastifyValidatorCompiler<Schema>): this;

  /**
   * Set the schema serializer for all routes.
   */
  setSerializerCompiler<Schema = FastifySchema>(schemaCompiler: FastifySerializerCompiler<Schema>): this;

  /**
  * Set the reply serializer for all routes.
  */
  setReplySerializer(replySerializer: (payload: unknown, statusCode: number) => string): this;

  /*
  * Set the schema error formatter for all routes.
  */
  setSchemaErrorFormatter(errorFormatter: (errors: FastifySchemaValidationError[], dataVar: string) => Error): this;

  /**
   * Add a content type parser
   */
  addContentTypeParser: AddContentTypeParser<Generic>;

  hasContentTypeParser: HasContentTypeParser;

  /**
   * Remove an existing content type parser
   */
  removeContentTypeParser: RemoveContentTypeParser

  /**
   * Remove all content type parsers, including the default ones
   */
  removeAllContentTypeParsers: RemoveAllContentTypeParsers

  /**
   * Fastify default JSON parser
   */
  getDefaultJsonParser: GetDefaultJsonParser;

  /**
   * Fastify default plain text parser
   */
  defaultTextParser: FastifyBodyParser<string>;

  /**
   * Prints the representation of the internal radix tree used by the router
   */
  printRoutes(opts?: PrintRoutesOptions): string;

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
    bodyLimit?: number,
    caseSensitive?: boolean,
    http2?: boolean,
    https?: boolean | Readonly<{ allowHTTP1: boolean }>,
    ignoreTrailingSlash?: boolean,
    disableRequestLogging?: boolean,
    maxParamLength?: number,
    onProtoPoisoning?: ProtoAction,
    onConstructorPoisoning?: ConstructorAction,
    pluginTimeout?: number,
    requestIdHeader?: string,
    requestIdLogLabel?: string,
    http2SessionTimeout?: number
  }>
}
