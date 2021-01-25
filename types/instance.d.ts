import { Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse, CallbackFunc as LightMyRequestCallback } from 'light-my-request'
import { RouteOptions, RouteShorthandMethod, RouteGenericInterface, DefaultRoute } from './route'
import { FastifySchemaCompiler, FastifySchemaValidationError, FastifySerializerCompiler } from './schema'
import { RawServerBase, RawRequestDefaultExpression, RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyLoggerInstance } from './logger'
import { FastifyRegister } from './register'
import { onRequestHookHandler, preParsingHookHandler, onSendHookHandler, preValidationHookHandler, preHandlerHookHandler, preSerializationHookHandler, onResponseHookHandler, onErrorHookHandler, onRouteHookHandler, onRegisterHookHandler, onCloseHookHandler, onReadyHookHandler, onTimeoutHookHandler, preParsingAsyncHookHandler, preValidationAsyncHookHandler, preHandlerAsyncHookHandler, preSerializationAsyncHookHandler, onSendAsyncHookHandler, onResponseAsyncHookHandler, onTimeoutAsyncHookHandler, onErrorAsyncHookHandler, onReadyAsyncHookHandler, onRequestAsyncHookHandler } from './hooks'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from 'fastify-error'
import { AddContentTypeParser, hasContentTypeParser } from './content-type-parser'

/**
 * Fastify server instance. Returned by the core `fastify()` method.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerInstance
> {
  server: RawServer;
  prefix: string;
  version: string | undefined;
  log: Logger;

  addSchema(schema: unknown): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;
  getSchema(schemaId: string): unknown;
  getSchemas(): Record<string, unknown>;

  after(): FastifyInstance<RawServer, RawRequest, RawReply, Logger> & PromiseLike<undefined>;
  after(afterListener: (err: Error) => void): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  close(): FastifyInstance<RawServer, RawRequest, RawReply, Logger> & PromiseLike<undefined>;
  close(closeListener: () => void): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enfore the users function returns what they expect it to
  decorate(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;
  decorateRequest(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;
  decorateReply(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  hasDecorator(decorator: string | symbol): boolean;
  hasRequestDecorator(decorator: string | symbol): boolean;
  hasReplyDecorator(decorator: string | symbol): boolean;

  inject(opts: InjectOptions | string, cb: LightMyRequestCallback): void;
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  inject(): LightMyRequestChain;

  listen(port: number | string, address: string, backlog: number, callback: (err: Error, address: string) => void): void;
  listen(port: number | string, address: string, callback: (err: Error, address: string) => void): void;
  listen(port: number | string, callback: (err: Error, address: string) => void): void;
  listen(port: number | string, address?: string, backlog?: number): Promise<string>;
  listen(opts: { port: number; host?: string; backlog?: number }, callback: (err: Error, address: string) => void): void;
  listen(opts: { port: number; host?: string; backlog?: number }): Promise<string>;

  ready(): FastifyInstance<RawServer, RawRequest, RawReply> & PromiseLike<undefined>;
  ready(readyListener: (err: Error) => void): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  register: FastifyRegister<FastifyInstance<RawServer, RawRequest, RawReply, Logger> & PromiseLike<undefined>>;

  getDefaultRoute: DefaultRoute<RawRequest, RawReply>;
  setDefaultRoute(defaultRoute: DefaultRoute<RawRequest, RawReply>): void;

  route<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(opts: RouteOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  get: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  head: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  post: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  put: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  delete: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  options: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  patch: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  all: RouteShorthandMethod<RawServer, RawRequest, RawReply>;

  // addHook: overloads

  // Lifecycle addHooks

  /**
   * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
   *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onRequest',
    hook: onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onRequest',
    hook: onRequestAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
   * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preParsing',
    hook: preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preParsing',
    hook: preParsingAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preValidation',
    hook: preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preValidation',
    hook: preValidationAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preHandler',
    hook: preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preHandler',
    hook: preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
   *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
   */
  addHook<
    PreSerializationPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preSerialization',
    hook: preSerializationHookHandler<PreSerializationPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    PreSerializationPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preSerialization',
    hook: preSerializationAsyncHookHandler<PreSerializationPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
   * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
   */
  addHook<
    OnSendPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onSend',
    hook: onSendHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    OnSendPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onSend',
    hook: onSendAsyncHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
   * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onResponse',
    hook: onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onResponse',
    hook: onResponseAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * `onTimeout` is useful if you need to monitor the request timed out in your service. (if the `connectionTimeout` property is set on the fastify instance)
   * The onTimeout hook is executed when a request is timed out and the http socket has been hanged up. Therefore you will not be able to send data to the client.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onTimeout',
    hook: onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onTimeout',
    hook: onTimeoutAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
   * It is not intended for changing the error, and calling reply.send will throw an exception.
   * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
   * Notice: unlike the other hooks, pass an error to the done function is not supported.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onError',
    hook: onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onError',
    hook: onErrorAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  // Application addHooks

  /**
   * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onRoute',
    hook: onRouteHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
  * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
  * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
  * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
  */
  addHook(
    name: 'onRegister',
    hook: onRegisterHookHandler<RawServer, RawRequest, RawReply, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
  * Triggered when fastify.listen() or fastify.ready() is invoked to start the server. It is useful when plugins need a "ready" event, for example to load data before the server start listening for requests.
  */
  addHook(
    name: 'onReady',
    hook: onReadyHookHandler
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  addHook(
    name: 'onReady',
    hook: onReadyAsyncHookHandler,
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
  * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
  */
  addHook(
    name: 'onClose',
    hook: onCloseHookHandler<RawServer, RawRequest, RawReply, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * Set the 404 handler
   */
  setNotFoundHandler<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
    handler: (request: FastifyRequest<RouteGeneric, RawServer, RawRequest>, reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric>) => void
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * Fastify default error handler
   */
  errorHandler: (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;

  /**
   * Set a function that will be called whenever an error happens
   */
  setErrorHandler<TError extends Error = FastifyError, RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
    handler: (this: FastifyInstance<RawServer, RawRequest, RawReply, Logger>, error: TError, request: FastifyRequest<RouteGeneric, RawServer, RawRequest>, reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric>) => void
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * Set the schema validator for all routes.
   */
  setValidatorCompiler(schemaCompiler: FastifySchemaCompiler): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
   * Set the schema serializer for all routes.
   */
  setSerializerCompiler(schemaCompiler: FastifySerializerCompiler): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /**
  * Set the reply serializer for all routes.
  */
  setReplySerializer(replySerializer: (payload: unknown, statusCode: number) => string): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

  /*
  * Set the schema error formatter for all routes.
  */
  setSchemaErrorFormatter(errorFormatter: (errors: FastifySchemaValidationError[], dataVar: string) => Error): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;
  /**
   * Add a content type parser
   */
  addContentTypeParser: AddContentTypeParser<RawServer, RawRequest>;
  hasContentTypeParser: hasContentTypeParser;

  /**
   * Prints the representation of the internal radix tree used by the router
   */
  printRoutes(): string;
}
