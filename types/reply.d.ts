import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyContext } from '../fastify'
import { RawReplyBase, RawReplyDefault } from './utils';

export type FastifyReply<RawReply extends RawReplyBase = RawReplyDefault> = RawReply & {
  callNotFound(): void
  code(statusCode: number): FastifyReply<RawReply>
  hasHeader(key: string): boolean
  header(key: string, value: any): FastifyReply<RawReply>
  getHeader(key: string): string | undefined
  // Note: should consider refactoring the argument order for redirect. statusCode is optional so it should be after the required url param
  redirect(statusCode: number, url: string): FastifyReply<RawReply>
  redirect(url: string): FastifyReply<RawReply>
  removeHeader(key: string): void
  send(payload?: any): FastifyReply<RawReply>
  serialize(payload: any): string
  serializer(fn: (payload: any) => string): FastifyReply<RawReply>
  status(statusCode: number): FastifyReply<RawReply>
  type(contentType: string): FastifyReply<RawReply>
  context: FastifyContext
  res: RawReply,
  sent: boolean
}