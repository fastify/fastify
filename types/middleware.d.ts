import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyInstance } from './instance'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils'

export interface FastifyMiddleware<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  (
    this: FastifyInstance<RawServer, RawRequest, RawReply>,
    req: FastifyRequest<RawServer, RawRequest>,
    reply: FastifyReply<RawServer, RawReply>,
    done: (err?: FastifyError) => void
  ): void
}

export interface FastifyMiddlewareWithPayload<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  (
    this: FastifyInstance<RawServer, RawRequest, RawReply>,
    req: FastifyRequest<RawServer, RawRequest>,
    reply: FastifyReply<RawServer, RawReply>,
    payload: any,
    done: (err?: FastifyError, value?: any) => void
  ): void
}