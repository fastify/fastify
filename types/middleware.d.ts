import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from '../fastify'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'

export type FastifyMiddleware<
  RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server, 
  RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest, 
  RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawRequest>,
  reply: FastifyReply<RawReply>,
  done: (err?: Error) => void,
) => void

export type FastifyMiddlewareWithPayload<
  RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server, 
  RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest, 
  RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawRequest>,
  reply: FastifyReply<RawReply>,
  payload: any,
  done: (err?: Error, value?: any) => void,
) => void