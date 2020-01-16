import { FastifyInstance } from './instance'
import { RouteOptions } from './route'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { FastifyLoggerOptions } from './logger'

type HookHandlerDoneFunction = (err?: FastifyError) => void

export enum FastifyHooks {
  onRoute, onRegister, onClose, onRequest, preParsing, preValidation, preSerialization, preHandler, onSend, onResponse, onError
}
export type FastifyHooksStrings = keyof typeof FastifyHooks

// Lifecycle Hooks

/**
 * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
 *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
 */
export interface onRequestHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (request: FastifyRequest<RawServer, RawRequest, RequestGeneric>, reply: FastifyReply<RawServer, RawReply, ContextConfig>, done: HookHandlerDoneFunction): void
}

/**
 * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
 * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
 */
export interface preParsingHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (request: FastifyRequest<RawServer, RawRequest, RequestGeneric>, reply: FastifyReply<RawServer, RawReply, ContextConfig>, done: HookHandlerDoneFunction): void
}

/**
 * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
 * Notice: in the `preValidation` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
 */
export interface preValidationHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (request: FastifyRequest<RawServer, RawRequest, RequestGeneric>, reply: FastifyReply<RawServer, RawReply, ContextConfig>, done: HookHandlerDoneFunction): void
}

/**
 * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
 */
export interface preHandlerHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (request: FastifyRequest<RawServer, RawRequest, RequestGeneric>, reply: FastifyReply<RawServer, RawReply, ContextConfig>, done: HookHandlerDoneFunction): void
}

// This is used within the `preSerialization` and `onSend` hook handlers
interface DoneFuncWithErrOrRes {
  (err: FastifyError): void;
  (err: null, res: unknown): void;
}

/**
 * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
 *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
 */
export interface preSerializationHookHandler<
  PreSerializationPayload,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestGeneric>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    payload: PreSerializationPayload,
    done: DoneFuncWithErrOrRes
  ): void
}

/**
 * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
 * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
 */
export interface onSendHookHandler<
  OnSendPayload,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestGeneric>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    payload: OnSendPayload,
    done: DoneFuncWithErrOrRes
  ): void
}

/**
 * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
 * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
 */
export interface onResponseHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (request: FastifyRequest<RawServer, RawRequest, RequestGeneric>, reply: FastifyReply<RawServer, RawReply, ContextConfig>, done: HookHandlerDoneFunction): void
}

/**
 * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
 * It is not intended for changing the error, and calling reply.send will throw an exception.
 * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
 * Notice: unlike the other hooks, pass an error to the done function is not supported.
 */
export interface onErrorHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestGeneric>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    error: FastifyError,
    done: () => void
  ): void
}

// Application Hooks

/**
 * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
 */
export interface onRouteHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> { 
  (opts: RouteOptions<RawServer, RawRequest, RawReply> & { path: string; prefix: string }): void
}

/**
 * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
 * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
 * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
 */
export interface onRegisterHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (instance: FastifyInstance<RawServer, RawRequest, RawReply, Logger>, done: HookHandlerDoneFunction): void // documentation is missing the `done` method
}

/**
 * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
 */
export interface onCloseHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (instance: FastifyInstance<RawServer, RawRequest, RawReply, Logger>, done: HookHandlerDoneFunction): void
}

export interface addHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  /**
   * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
   *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  (
    name: 'onRequest',
    hook: onRequestHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
   * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  (
    name: 'preParsing',
    hook: preParsingHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
   * Notice: in the `preValidation` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
   */
  (
    name: 'preValidation',
    hook: preValidationHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
   */
  (
    name: 'preHandler',
    hook: preHandlerHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
   *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
   */
  <Payload = unknown>(
    name: 'preSerialization',
    hook: preSerializationHookHandler<Payload, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
   * Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
   */
  <Payload = unknown>(
    name: 'onSend',
    hook: onSendHookHandler<Payload, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
   * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
   */
  (
    name: 'onResponse',
    hook: onResponseHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
   * It is not intended for changing the error, and calling reply.send will throw an exception.
   * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
   * Notice: unlike the other hooks, pass an error to the done function is not supported.
   */
  (
    name: 'onError',
    hook: onErrorHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
   */
  (
    name: 'onRoute',
    hook: onRouteHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
   * This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
   * Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
   */
  (
    name: 'onRegister',
    hook: onRegisterHookHandler<RawServer, RawRequest, RawReply, Logger, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
  /**
   * Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
   */
  (
    name: 'onClose',
    hook: onCloseHookHandler<RawServer, RawRequest, RawReply, Logger, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}