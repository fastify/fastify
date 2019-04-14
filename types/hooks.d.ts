import { FastifyMiddleware } from './middleware'
import { FastifyInstance } from './instance'
import { RouteOptions } from './route'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'

/**
 * Add a hook that is triggered after the onRequest hook and middlewares, but before body parsing
 */
export type preParsingHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'preParsin', hook: preParsingHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type preParsingHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Add a hook that is triggered after the onRequest, middlewares, and body parsing, but before the validation
 */
export type preValidationHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'preParsin', hook: preValidationHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type preValidationHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Hook that is fired after a request is processed, but before the response is serialized
 * hook
 */
export type preSerializationHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'preParsin', hook: preSerializationHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type preSerializationHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Hook that is fired before a request is processed, but after the "preValidation" hook
 */
export type preHandlerHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'preParsin', hook: preHandlerHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type preHandlerHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Adds a hook that is triggered when server.close is called. Useful for closing connections
 * and performing cleanup tasks
 */
export type onCloseHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'onClose', hook: onCloseHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type onCloseHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (instance: FastifyInstance<RawServer, RawRequest, RawReply>, done: () => void) => void

/**
 * Adds a hook that is triggered when a new route is registered. Listeners are passed a
 * routeOptions object as the sole parameter.
 * The interface is synchronous, and, as such, the listeners do not get passed a callback.
 */
export type onRouteHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'onRoute', hook: onRouteHookHandler) => FastifyInstance<RawServer, RawRequest, RawReply>

export type onRouteHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (opts: RouteOptions<RawServer, RawRequest, RawReply> & { path: string, prefix: string }) => void

/**
 * Add a hook that is triggered when a request is initially received
 */
export type onRequestHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'onRequest', hook: onRequestHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type onRequestHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Hook that is fired after a request is processed, but before the "onResponse"
 * hook
 */
export type onSendHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'onSend', hook: onSendHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type onSendHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  payload: any,
  done: (err?: Error, value?: any) => void
) => void

/**
 * Hook that is fired if `reply.send` is invoked with an Error
 */
export type onErrorHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (name: 'onError', hook: onErrorHookHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type onErrorHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  error: FastifyError,
  done: () => void
) => void
