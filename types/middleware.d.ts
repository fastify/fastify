import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault, ContextConfigDefault } from './utils'
import { RequestGenericInterface } from './request'
/**
 * Fastify Middleware
 *
 * Fastify out of the box provides an asynchronous middleware engine compatible with Express and Restify middlewares.
 */
export interface FastifyMiddleware<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestGeneric>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    done: (err?: FastifyError) => void
  ): void;
}

/**
 * Fastify Middleware
 *
 * Fastify out of the box provides an asynchronous middleware engine compatible with Express and Restify middlewares.
 */
export interface FastifyMiddlewareWithPayload<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestGeneric>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    payload: any,
    done: (err?: FastifyError, value?: any) => void
  ): void;
}
