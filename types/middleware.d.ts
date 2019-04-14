import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from './instance'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

export type FastifyMiddleware<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  done: (err?: Error) => void,
) => void

export type FastifyMiddlewareWithPayload<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  req: FastifyRequest<RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawReply>,
  payload: any,
  done: (err?: Error, value?: any) => void,
) => void