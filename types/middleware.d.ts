import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from './instance'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault, ContextConfigDefault } from './utils'

/**
 * Fastify Middleware 
 * 
 * Fastify out of the box provides an asynchronous middleware engine compatible with Express and Restify middlewares.
 */
export interface FastifyMiddleware<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    done: (err?: FastifyError) => void
  ): void
}

/**
 * Fastify Middleware 
 * 
 * Fastify out of the box provides an asynchronous middleware engine compatible with Express and Restify middlewares.
 */
export interface FastifyMiddlewareWithPayload<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>,
  RequestBody = RequestBodyDefault,
  RequestQuerystring = RequestQuerystringDefault,
  RequestParams = RequestParamsDefault,
  RequestHeaders = RequestHeadersDefault,
  ContextConfig = ContextConfigDefault
> {
  (
    request: FastifyRequest<RawServer, RawRequest, RequestBody, RequestQuerystring, RequestParams, RequestHeaders>,
    reply: FastifyReply<RawServer, RawReply, ContextConfig>,
    payload: any,
    done: (err?: FastifyError, value?: any) => void
  ): void
}