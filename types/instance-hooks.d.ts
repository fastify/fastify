import { FastifyError } from '@fastify/error'
import {
  ApplicationHook,
  HookAsyncLookup,
  HookLookup,
  LifecycleHook,
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
  preValidationHookHandler
} from './hooks'
import { FastifyBaseLogger } from './logger'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { ContextConfigDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from './utils'

type AnyFunction = (...args: never[]) => unknown
type AsyncFunction = (...args: never[]) => Promise<unknown>

type SelectHookHandler<Fn, CallbackHandler, AsyncHandler> =
  Fn extends unknown ? (Fn extends AsyncFunction ? AsyncHandler : CallbackHandler) : Fn

/** Ordered addHook overloads for lifecycle and application hooks. */
export interface FastifyInstanceHooks<
  Instance,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> {
  // addHook: overloads

  // Lifecycle addHooks

  /**
   * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
   *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>
        | onRequestAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'onRequest',
    hook: SelectHookHandler<
      Fn,
      onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>,
      onRequestAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
   * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | preParsingAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'preParsing',
    hook: SelectHookHandler<
      Fn,
      preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>,
      preParsingAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | preValidationAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'preValidation',
    hook: SelectHookHandler<
      Fn,
      preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>,
      preValidationAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | preHandlerAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'preHandler',
    hook: SelectHookHandler<
      Fn,
      preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>,
      preHandlerAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
   *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
   */
  addHook<
    PreSerializationPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | preSerializationHookHandler<
          PreSerializationPayload,
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        >
        | preSerializationAsyncHookHandler<
          PreSerializationPayload,
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = preSerializationHookHandler<
      PreSerializationPayload,
      RawServer,
      RawRequest,
      RawReply,
      RouteGeneric,
      ContextConfig,
      SchemaCompiler,
      TypeProvider,
      HookLogger
    >
  >(
    name: 'preSerialization',
    hook: SelectHookHandler<
      Fn,
      preSerializationHookHandler<
        PreSerializationPayload,
        RawServer,
        RawRequest,
        RawReply,
        RouteGeneric,
        ContextConfig,
        SchemaCompiler,
        TypeProvider,
        HookLogger
      >,
      preSerializationAsyncHookHandler<
        PreSerializationPayload,
        RawServer,
        RawRequest,
        RawReply,
        RouteGeneric,
        ContextConfig,
        SchemaCompiler,
        TypeProvider,
        HookLogger
      >
    >
  ): Instance

  /**
   * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
   * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
   */
  addHook<
    OnSendPayload = unknown,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onSendHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | onSendAsyncHookHandler<
          OnSendPayload,
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onSendHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig,
          SchemaCompiler, TypeProvider, HookLogger>
  >(
    name: 'onSend',
    hook: SelectHookHandler<
      Fn,
      onSendHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>,
      onSendAsyncHookHandler<OnSendPayload, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig,
        SchemaCompiler, TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
   * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | onResponseAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'onResponse',
    hook: SelectHookHandler<
      Fn,
      onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>,
      onResponseAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `onTimeout` is useful if you need to monitor the request timed out in your service. (if the `connectionTimeout` property is set on the fastify instance)
   * The onTimeout hook is executed when a request is timed out and the http socket has been hanged up. Therefore you will not be able to send data to the client.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>
        | onTimeoutAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'onTimeout',
    hook: SelectHookHandler<
      Fn,
      onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
        HookLogger>,
      onTimeoutAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * `onRequestAbort` is useful if you need to monitor the if the client aborts the request (if the `request.raw.aborted` property is set to `true`).
   * The `onRequestAbort` hook is executed when a client closes the connection before the entire request has been received. Therefore, you will not be able to send data to the client.
   * Notice: client abort detection is not completely reliable. See: https://github.com/fastify/fastify/blob/main/docs/Guides/Detecting-When-Clients-Abort.md
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onRequestAbortHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
        | onRequestAbortAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onRequestAbortHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
          TypeProvider, HookLogger>
  >(
    name: 'onRequestAbort',
    hook: SelectHookHandler<
      Fn,
      onRequestAbortHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>,
      onRequestAbortAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler,
        TypeProvider, HookLogger>
    >
  ): Instance

  /**
   * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
   * It is not intended for changing the error, and calling reply.send will throw an exception.
   * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
   * Notice: unlike the other hooks, pass an error to the done function is not supported.
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger,
    Fn extends
    | onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError, SchemaCompiler,
        TypeProvider, HookLogger>
        | onErrorAsyncHookHandler<
          RawServer,
          RawRequest,
          RawReply,
          RouteGeneric,
          ContextConfig,
          FastifyError,
          SchemaCompiler,
          TypeProvider,
          HookLogger
        > = onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError,
          SchemaCompiler, TypeProvider, HookLogger>
  >(
    name: 'onError',
    hook: SelectHookHandler<
      Fn,
      onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError, SchemaCompiler,
        TypeProvider, HookLogger>,
      onErrorAsyncHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError,
        SchemaCompiler, TypeProvider, HookLogger>
    >
  ): Instance

  // Application addHooks

  /**
   * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
   */
  addHook<
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    HookLogger extends FastifyBaseLogger = Logger
  >(
    name: 'onRoute',
    hook: onRouteHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider,
      HookLogger>
  ): Instance

  /**
   * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
   * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
   * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
   */
  addHook(name: 'onRegister', hook: onRegisterHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>): Instance

  /**
   * Triggered when fastify.listen() or fastify.ready() is invoked to start the server. It is useful when plugins need a "ready" event, for example to load data before the server start listening for requests.
   */
  addHook<
    Fn extends
    | onReadyHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    | onReadyAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider> = onReadyHookHandler<
      RawServer,
      RawRequest,
      RawReply,
      Logger,
      TypeProvider
    >
  >(
    name: 'onReady',
    hook: SelectHookHandler<
      Fn,
      onReadyHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      onReadyAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >
  ): Instance

  /**
   * Triggered when fastify.listen() is invoked to start the server. It is useful when plugins need a "onListen" event, for example to run logics after the server start listening for requests.
   */
  addHook<
    Fn extends
    | onListenHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    | onListenAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider> = onListenHookHandler<
      RawServer,
      RawRequest,
      RawReply,
      Logger,
      TypeProvider
    >
  >(
    name: 'onListen',
    hook: SelectHookHandler<
      Fn,
      onListenHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      onListenAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >
  ): Instance

  /**
   * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
   */
  addHook<
    Fn extends
    | onCloseHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    | onCloseAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider> = onCloseHookHandler<
      RawServer,
      RawRequest,
      RawReply,
      Logger,
      TypeProvider
    >
  >(
    name: 'onClose',
    hook: SelectHookHandler<
      Fn,
      onCloseHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      onCloseAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >
  ): Instance

  /**
   * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need to cancel some state to allow the server to close successfully.
   */
  addHook<
    Fn extends
    | preCloseHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    | preCloseAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider> = preCloseHookHandler<
      RawServer,
      RawRequest,
      RawReply,
      Logger,
      TypeProvider
    >
  >(
    name: 'preClose',
    hook: SelectHookHandler<
      Fn,
      preCloseHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
      preCloseAsyncHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>
    >
  ): Instance

  addHook<K extends ApplicationHook | LifecycleHook, Fn extends AnyFunction>(name: K, hook: SelectHookHandler<Fn,
    HookLookup<K>, HookAsyncLookup<K>>): Instance
}
