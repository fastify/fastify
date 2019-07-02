import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { ParsedUrlQuery } from 'querystring'

import { FastifyInstance } from './instance'
import { FastifyMiddleware, FastifyMiddlewareWithPayload } from './middleware'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'
import { LogLevels } from './logger'
/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders>(
    path: string,
    opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders>(
    path: string,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  <RequestBody, RequestQuerystring, RequestParams, RequestHeaders>(
    path: string,
    opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

/**
 * Route shorthand options for the various shorthand methods
 */
export interface RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault
> {
  schema?: FastifySchema,
  attachValidation?: boolean,
  preValidation?: FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders> | FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>[],
  preHandler?: FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders> | FastifyMiddleware<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>[],
  preSerialization?: FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders> | FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>[],
  schemaCompiler?: FastifySchemaCompiler,
  bodyLimit?: number,
  logLevel?: LogLevels,
  config?: any, // TODO: this shouldn't be any
  version?: string,
  prefixTrailingSlash?: boolean
}

/**
 * Fastify route method options. 
 */
export interface RouteOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders> {
  method: HTTPMethods | HTTPMethods[],
  url: string,
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
}

/**
 * Shorthand options including the handler function property
 */
export interface RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders> {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>
}

/**
 * Route handler method declaration.
 */
export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault
> = (
  request: FastifyRequest<RawServer, RawRequest, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
  reply: FastifyReply<RawServer, RawReply>
) => void | Promise<any>
