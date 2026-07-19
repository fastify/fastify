import * as http from 'node:http'
import * as http2 from 'node:http2'
import { FastifyBaseLogger } from './logger'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import {
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerBase,
  RawServerDefault
} from './utils'

/** Internal normalized state shared by Fastify type constructors. */
export interface FastifyTypeContext {
  RawServer: RawServerBase
  RawRequest: http.IncomingMessage | http2.Http2ServerRequest
  RawReply: http.ServerResponse | http2.Http2ServerResponse
  Logger: FastifyBaseLogger
  TypeProvider: FastifyTypeProvider
}

/** Builds normalized state from the public positional generic parameters. */
export type FastifyTypeContextOf<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> =
  RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> =
  RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> = {
  RawServer: RawServer
  RawRequest: RawRequest
  RawReply: RawReply
  Logger: Logger
  TypeProvider: TypeProvider
}

/** Restores the request/server dependency after indexing normalized state. */
export type RawRequestOf<Context extends FastifyTypeContext> = Extract<
  Context['RawRequest'],
  RawRequestDefaultExpression<Context['RawServer']>
>

/** Restores the reply/server dependency after indexing normalized state. */
export type RawReplyOf<Context extends FastifyTypeContext> = Extract<
  Context['RawReply'],
  RawReplyDefaultExpression<Context['RawServer']>
>
