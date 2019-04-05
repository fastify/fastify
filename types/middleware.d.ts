import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from '../fastify'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

export type FastifyMiddleware<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault, 
  RawReply extends RawReplyBase = RawReplyDefault
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawRequest>,
  reply: FastifyReply<RawReply>,
  done: (err?: Error) => void,
) => void

export type FastifyMiddlewareWithPayload<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault, 
  RawReply extends RawReplyBase = RawReplyDefault
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawRequest>,
  reply: FastifyReply<RawReply>,
  payload: any,
  done: (err?: Error, value?: any) => void,
) => void