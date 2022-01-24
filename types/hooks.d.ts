import { FastifyError } from 'fastify-error'
import { Readable } from 'stream'
import { DefaultFastifyInstanceGenericInterface, FastifyInstance, FastifyInstanceGenericInterface } from './instance'
import { FastifyReply } from './reply'
import { FastifyRequest } from './request'
import { DefaultFastifyInstanceRouteGenericInterface, FastifyInstanceRouteGenericInterface, RouteOptions } from './route'

type HookHandlerDoneFunction = <TError extends Error = FastifyError>(err?: TError) => void

interface RequestPayload extends Readable {
  receivedEncodedLength?: number;
}

// Lifecycle Hooks

/**
 * `onRequest` is the first hook to be executed in the request lifecycle. There was no previous hook, the next hook will be `preParsing`.
 *  Notice: in the `onRequest` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
 */
export interface onRequestHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface onRequestAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
  ): Promise<unknown>;
}

/**
 * `preParsing` is the second hook to be executed in the request lifecycle. The previous hook was `onRequest`, the next hook will be `preValidation`.
 * Notice: in the `preParsing` hook, request.body will always be null, because the body parsing happens before the `preHandler` hook.
 */
export interface preParsingHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: RequestPayload,
    done: <TError extends Error = FastifyError>(err?: TError | null, res?: RequestPayload) => void
  ): void;
}

export interface preParsingAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: RequestPayload,
  ): Promise<RequestPayload | unknown>;
}

/**
 * `preValidation` is the third hook to be executed in the request lifecycle. The previous hook was `preParsing`, the next hook will be `preHandler`.
 */
export interface preValidationHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface preValidationAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
  ): Promise<unknown>;
}

/**
 * `preHandler` is the fourth hook to be executed in the request lifecycle. The previous hook was `preValidation`, the next hook will be `preSerialization`.
 */
export interface preHandlerHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface preHandlerAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
  ): Promise<unknown>;
}

// This is used within the `preSerialization` and `onSend` hook handlers
interface DoneFuncWithErrOrRes {
  (): void;
  <TError extends Error = FastifyError>(err: TError): void;
  (err: null, res: unknown): void;
}

/**
 * `preSerialization` is the fifth hook to be executed in the request lifecycle. The previous hook was `preHandler`, the next hook will be `onSend`.
 *  Note: the hook is NOT called if the payload is a string, a Buffer, a stream or null.
 */
export interface preSerializationHookHandler<
  PreSerializationPayload,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: PreSerializationPayload,
    done: DoneFuncWithErrOrRes
  ): void;
}

export interface preSerializationAsyncHookHandler<
  PreSerializationPayload,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: PreSerializationPayload
  ): Promise<unknown>;
}

/**
* You can change the payload with the `onSend` hook. It is the sixth hook to be executed in the request lifecycle. The previous hook was `preSerialization`, the next hook will be `onResponse`.
* Note: If you change the payload, you may only change it to a string, a Buffer, a stream, or null.
*/
export interface onSendHookHandler<
  OnSendPayload,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: OnSendPayload,
    done: DoneFuncWithErrOrRes
  ): void;
}

export interface onSendAsyncHookHandler<
  OnSendPayload,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    payload: OnSendPayload,
  ): Promise<unknown>;
}

/**
 * `onResponse` is the seventh and last hook in the request hook lifecycle. The previous hook was `onSend`, there is no next hook.
 * The onResponse hook is executed when a response has been sent, so you will not be able to send more data to the client. It can however be useful for sending data to external services, for example to gather statistics.
 */
export interface onResponseHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface onResponseAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
  ): Promise<unknown>;
}

/**
* `onTimeout` is useful if you need to monitor the request timed out in your service. (if the `connectionTimeout` property is set on the fastify instance)
* The onTimeout hook is executed when a request is timed out and the http socket has been hanged up. Therefore you will not be able to send data to the client.
*/
export interface onTimeoutHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface onTimeoutAsyncHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
  ): Promise<unknown>;
}

/**
 * This hook is useful if you need to do some custom error logging or add some specific header in case of error.
 * It is not intended for changing the error, and calling reply.send will throw an exception.
 * This hook will be executed only after the customErrorHandler has been executed, and only if the customErrorHandler sends an error back to the user (Note that the default customErrorHandler always sends the error back to the user).
 * Notice: unlike the other hooks, pass an error to the done function is not supported.
 */
export interface onErrorHookHandler<
  TError extends Error = FastifyError,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    error: TError,
    done: () => void
  ): void;
}

export interface onErrorAsyncHookHandler<
  TError extends Error = FastifyError,
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    request: FastifyRequest<Generic>,
    reply: FastifyReply<Generic>,
    error: TError
  ): Promise<unknown>;
}

// Application Hooks

/**
 * Triggered when a new route is registered. Listeners are passed a routeOptions object as the sole parameter. The interface is synchronous, and, as such, the listener does not get passed a callback
 */
export interface onRouteHookHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  (
    this: FastifyInstance<Generic>,
    opts: RouteOptions<Generic> & { routePath: string; path: string; prefix: string }
  ): Promise<unknown> | void;
}

/**
* Triggered when a new plugin is registered and a new encapsulation context is created. The hook will be executed before the registered code.
* This hook can be useful if you are developing a plugin that needs to know when a plugin context is formed, and you want to operate in that specific context.
* Note: This hook will not be called if a plugin is wrapped inside fastify-plugin.
*/
export interface onRegisterHookHandler<
  Generic extends FastifyInstanceGenericInterface = DefaultFastifyInstanceGenericInterface
> {
  (
    instance: FastifyInstance<Generic>,
    done: HookHandlerDoneFunction
  ): Promise<unknown> | void; // documentation is missing the `done` method
}

/**
* Triggered when fastify.listen() or fastify.ready() is invoked to start the server. It is useful when plugins need a "ready" event, for example to load data before the server start listening for requests.
*/
export interface onReadyHookHandler {
  (
    this: FastifyInstance,
    done: HookHandlerDoneFunction
  ): void;
}

export interface onReadyAsyncHookHandler {
  (
    this: FastifyInstance,
  ): Promise<unknown>;
}
/**
* Triggered when fastify.close() is invoked to stop the server. It is useful when plugins need a "shutdown" event, for example to close an open connection to a database.
*/
export interface onCloseHookHandler<
  Generic extends FastifyInstanceGenericInterface = DefaultFastifyInstanceGenericInterface
> {
  (
    instance: FastifyInstance<Generic>,
    done: HookHandlerDoneFunction
  ): void;
}

export interface onCloseAsyncHookHandler<
  Generic extends FastifyInstanceGenericInterface = DefaultFastifyInstanceGenericInterface
> {
  (
    instance: FastifyInstance<Generic>
  ): Promise<unknown>;
}
