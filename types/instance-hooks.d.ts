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
  // Lifecycle hooks
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

  // Application hooks
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

  addHook(name: 'onRegister', hook: onRegisterHookHandler<RawServer, RawRequest, RawReply, Logger, TypeProvider>): Instance

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
