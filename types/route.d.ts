import { FastifyInstance } from './instance'
import { FastifyMiddleware, FastifyMiddlewareWithPayload } from './middleware'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault, ContextConfigDefault } from './utils'
import { LogLevels } from './logger'

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>(
    path: string,
    opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>(
    path: string,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>(
    path: string,
    opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Route shorthand options for the various shorthand methods
 */
export interface RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> {
  schema?: FastifySchema;
  attachValidation?: boolean;
  preValidation?: FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig> | FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>[];
  preHandler?: FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig> | FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>[];
  preSerialization?: FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig> | FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>[];
  schemaCompiler?: FastifySchemaCompiler;
  bodyLimit?: number;
  logLevel?: LogLevels;
  config?: ContextConfig;
  version?: string;
  prefixTrailingSlash?: boolean;
}

/**
 * Fastify route method options.
 */
export interface RouteOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig> {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>;
}

/**
 * Shorthand options including the handler function property
 */
export interface RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig> {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders, ContextConfig>;
}

/**
 * Route handler method declaration.
 */
export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> = (
  request: FastifyRequest<RawServer, RawRequest, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
  reply: FastifyReply<RawServer, RawReply, ContextConfig>
) => void | Promise<any>
