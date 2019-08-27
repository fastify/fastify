import { RawReplyDefaultExpression, RawServerBase, RawServerDefault, ContextConfigDefault } from './utils'
import { FastifyContext } from './context'

/**
 * FastifyReply is an instance of the standard http or http2 reply types.
 * It defaults to http.ServerResponse, and it also extends the relative reply object.
 */
export type FastifyReply<
  RawServer extends RawServerBase = RawServerDefault,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  ContextConfig = ContextConfigDefault
> = RawReply & {
  callNotFound(): void;
  code(statusCode: number): FastifyReply<RawServer, RawReply>;
  hasHeader(key: string): boolean;
  header(key: string, value: any): FastifyReply<RawServer, RawReply>;
  getHeader(key: string): string | undefined;
  // Note: should consider refactoring the argument order for redirect. statusCode is optional so it should be after the required url param
  redirect(statusCode: number, url: string): FastifyReply<RawServer, RawReply>;
  redirect(url: string): FastifyReply<RawServer, RawReply>;
  removeHeader(key: string): void;
  send(payload?: any): FastifyReply<RawServer, RawReply>;
  serialize(payload: any): string;
  serializer(fn: (payload: any) => string): FastifyReply<RawServer, RawReply>;
  status(statusCode: number): FastifyReply<RawServer, RawReply>;
  type(contentType: string): FastifyReply<RawServer, RawReply>;
  context: FastifyContext<ContextConfig>;
  res: RawReply;
  sent: boolean;
}
