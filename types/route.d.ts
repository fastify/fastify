import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from './instance'
import { FastifyMiddleware, FastifyMiddlewareWithPayload } from './middleware'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  (
    path: string,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  (
    path: string,
    opts: RouteShorthandOptions<RawServer, RawRequest, RawReply>,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  (
    path: string,
    opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply>
  ): FastifyInstance<RawServer, RawRequest, RawReply>
}

export interface RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  schema?: FastifySchema,
  attachValidation?: boolean,
  preValidation?: FastifyMiddleware<RawServer, RawRequest, RawReply> | FastifyMiddleware<RawServer, RawRequest, RawReply>[],
  preHandler?: FastifyMiddleware<RawServer, RawRequest, RawReply> | FastifyMiddleware<RawServer, RawRequest, RawReply>[],
  preSerialization?: FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply> | FastifyMiddlewareWithPayload<RawServer, RawRequest, RawReply>[],
  schemaCompiler?: FastifySchemaCompiler,
  bodyLimit?: number,
  logLevel?: string, // TODO: maybe restrict to FastifyLogger log levels
  config?: any, // TODO: this shouldn't be any
  version?: string
}

export interface RouteOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> extends RouteShorthandOptions {
  method: HTTPMethods | HTTPMethods[],
  url: string,
  handler: RouteHandlerMethod,
}

export interface RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> extends RouteShorthandOptions {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>
}

export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  request: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>
) => void | Promise<any>
