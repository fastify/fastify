import { FastifyMiddleware } from './middleware'
import { FastifyInstance } from './instance'
import { RouteOptions } from './route'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'

/**
 * preParsing hook useful for authentication
 */
export type preParsingHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * preValidation hook useful for authentication. Runs after request, middleware, and parsing steps.
 */
export type preValidationHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * preSerialization hook that is triggered after a request is processed, but before the response is serialized
 */
export type preSerializationHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = (
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  payload: unknown,
  done: (err?: Error, value?: any) => void
) => FastifyMiddleware<RawServer, RawRequest, RawReply> | void

/**
 * preHandler hook that is triggered before a request is processed, but after the preValidation hook
 */
export type preHandlerHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Adds a hook that is triggered when server.close is called. Useful for closing connections
 * and performing cleanup tasks
 */
export type onCloseHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = (instance: FastifyInstance<RawServer, RawRequest, RawReply>, done: () => void) => void

/**
 * Adds a hook that is triggered when a new route is registered. Listeners are passed a
 * routeOptions object as the sole parameter.
 * The interface is synchronous, and, as such, the listeners do not get passed a callback.
 */
export type onRouteHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = (opts: RouteOptions<RawServer, RawRequest, RawReply> & { path: string; prefix: string }) => void

/**
 * Handler function for onRequest hook
 */
export type onRequestHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Handler function for onRequest hook
 */
export type onResponseHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = FastifyMiddleware<RawServer, RawRequest, RawReply>

/**
 * Hook that is fired after a request is processed, but before the "onResponse" hook
 */
export type onSendHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = (
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  payload: unknown,
  done: (err?: Error, value?: any) => void
) => FastifyMiddleware<RawServer, RawRequest, RawReply> | void

/**
 * Hook that is fired if `reply.send` is invoked with an Error
 */
export type onErrorHookHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> = (
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  error: FastifyError,
  done: () => void
) => FastifyMiddleware<RawServer, RawRequest, RawReply> | void

export type Hooks = 'onError' | 'onSend' | 'onRequest' | 'onResponse' | 'onRoute' | 'onClose' | 'preHandler' | 'preSerialization' | 'preValidation' | 'preParsing'

export interface AddHook<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> {
  <Name extends Hooks>(
    name: Name,
    hook: addHookHandler<Name, RawServer, RawRequest, RawReply>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

type addHookHandler<
  Name extends Hooks,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> = Name extends 'onError' ? onErrorHookHandler<RawServer, RawRequest, RawReply>
  : Name extends 'onSend' ? onSendHookHandler<RawServer, RawRequest, RawReply>
    : Name extends 'onRequest' ? onRequestHookHandler<RawServer, RawRequest, RawReply>
      : Name extends 'onResponse' ? onResponseHookHandler<RawServer, RawRequest, RawReply>
        : Name extends 'onRoute' ? onRouteHookHandler<RawServer, RawRequest, RawReply>
          : Name extends 'onClose' ? onCloseHookHandler<RawServer, RawRequest, RawReply>
            : Name extends 'preHandler' ? preHandlerHookHandler<RawServer, RawRequest, RawReply>
              : Name extends 'preSerialization' ? preSerializationHookHandler<RawServer, RawRequest, RawReply>
                : Name extends 'preValidation' ? preValidationHookHandler<RawServer, RawRequest, RawReply>
                  : Name extends 'preParsing' ? preParsingHookHandler<RawServer, RawRequest, RawReply>
                    : never
