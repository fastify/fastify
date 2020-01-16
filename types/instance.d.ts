import { InjectOptions, InjectPayload } from 'light-my-request'
import { RouteOptions, RouteShorthandMethod } from './route'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { RawServerBase, RawRequestDefaultExpression, RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyLoggerOptions } from './logger'
import { FastifyRegister } from './register'
import { onRequestHookHandler, preParsingHookHandler, onSendHookHandler, preValidationHookHandler, preHandlerHookHandler, preSerializationHookHandler, onResponseHookHandler, onErrorHookHandler, onRouteHookHandler, onRegisterHookHandler, onCloseHookHandler } from './hooks'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { AddContentTypeParser, hasContentTypeParser } from './content-type-parser'

/**
 * Fastify server instance. Returned by the core `fastify()` method.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>
> {
  server: RawServer;
  prefix: string;
  log: Logger;

  addSchema(schema: FastifySchema): FastifyInstance<RawServer, RawRequest, RawReply>;

  after(err: Error): FastifyInstance<RawServer, RawRequest, RawReply>;

  close(closeListener?: () => void): void;
  close<T>(): Promise<T>; // what is this use case? Not documented on Server#close

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enfore the users function returns what they expect it to
  decorate(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;
  decorateRequest(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;
  decorateReply(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;

  hasDecorator(decorator: string | symbol): boolean;
  hasRequestDecorator(decorator: string | symbol): boolean;
  hasReplyDecorator(decorator: string | symbol): boolean;

  inject(opts: InjectOptions | string, cb: (err: Error, response: InjectPayload) => void): void;
  inject(opts: InjectOptions | string): Promise<InjectPayload>;

  listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void;
  listen(port: number, address: string, callback: (err: Error, address: string) => void): void;
  listen(port: number, callback: (err: Error, address: string) => void): void;
  listen(port: number, address?: string, backlog?: number): Promise<string>;

  ready(): Promise<FastifyInstance<RawServer, RawRequest, RawReply>>;
  ready(readyListener: (err: Error) => void): void;

  register: FastifyRegister<RawServer, RawRequest, RawReply>;
  /**
   * This method is now deprecated and will throw a `FST_ERR_MISSING_MIDDLEWARE` error.
   * Visit fastify.io/docs/latest/Middleware/ for more info.
   */
  use: void;

  route<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(opts: RouteOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>): FastifyInstance<RawServer, RawRequest, RawReply>;

  // Would love to implement something like the following:
  // [key in RouteMethodsLower]: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>,

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
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onRequest',
    hook: onRequestHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
   * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preParsing',
    hook: preParsingHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
   * Notice: in the `preValidation` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preValidation',
    hook: preValidationHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preHandler',
    hook: preHandlerHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
   *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
   */
  addHook<
    PreSerializationPayload = unknown,
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'preSerialization',
    hook: preSerializationHookHandler<PreSerializationPayload, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
   * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
   */
  addHook<
    OnSendPayload = unknown,
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onSend',
    hook: onSendHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
   * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onResponse',
    hook: onResponseHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
   * It is not intended for changing the error, and calling reply.send will throw an exception.
   * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
   * Notice: unlike the other hooks, pass an error to the done function is not supported.
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onError',
    hook: onErrorHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  // Application addHooks

  /**
   * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
   */
  addHook<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(
    name: 'onRoute',
    hook: onRouteHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

   /**
   * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
   * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
   * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
   */
  addHook(
    name: 'onRegister',
    hook: onRegisterHookHandler<RawServer, RawRequest, RawReply, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

   /**
   * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
   */
  addHook(
    name: 'onClose',
    hook: onCloseHookHandler<RawServer, RawRequest, RawReply, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * Set the 404 handler
   */
  setNotFoundHandler(
    handler: (request: FastifyRequest<RawServer, RawRequest>, reply: FastifyReply<RawServer, RawReply>) => void
  ): void;

  /**
   * Set a function that will be called whenever an error happens
   */
  setErrorHandler(
    handler: (error: FastifyError, request: FastifyRequest<RawServer, RawRequest>, reply: FastifyReply<RawServer, RawReply>) => void
  ): void;

  /**
   * Set the schema validator for all routes.
   */
  setValidatorCompiler(schemaCompiler: FastifySchemaCompiler): FastifyInstance<RawServer, RawRequest, RawReply>;
  
  /**
   * Set the schema serializer for all routes.
   */
  setSerializerCompiler(schemaCompiler: FastifySchemaCompiler): FastifyInstance<RawServer, RawRequest, RawReply>;

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
