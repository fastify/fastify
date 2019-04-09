import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from '../fastify'
import { FastifyMiddleware, FastifyMiddlewareWithPayload } from './middleware'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

export type RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = (path: string, handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type RouteShorthandMethodWithOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = (path: string, opts: RouteShorthandOptions<RawServer, RawRequest, RawReply>, handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type RouteShorthandMethodWithoutHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = (path: string, opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply>) => FastifyInstance<RawServer, RawRequest, RawReply>

export type RouteOptions<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault, 
  RawReply extends RawReplyBase = RawReplyDefault
> = RouteShorthandOptions<RawServer, RawRequest, RawReply> & {
  method: HTTPMethods | HTTPMethods[],
  url: string,
  handler: RouteHandlerMethod,
}

export type RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault, 
  RawReply extends RawReplyBase = RawReplyDefault
> = {
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

export type RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = RouteShorthandOptions<RawServer, RawRequest, RawReply> & {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply>
}

export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  request: FastifyRequest<RawRequest>,
  reply: FastifyReply<RawReply>
) => void | Promise<any>

export type RouteShorthandIntersection<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault,
  RawReply extends RawReplyBase = RawReplyDefault
> = RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithoutHandler<RawServer, RawRequest, RawReply>