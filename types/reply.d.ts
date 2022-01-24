import { FastifyContext } from './context'
import { FastifyInstance } from './instance'
import { FastifyRequest } from './request'
import { DefaultFastifyInstanceRouteGenericInterface, FastifyInstanceRouteGenericInterface } from './route'
import { FastifyReplyType, ResolveFastifyReplyType } from './type-provider'
import { GetLogger, GetReply, GetRouteContext, OverrideRouteGeneric, ReplyDefault } from './utils'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

/**
 * FastifyReply is an instance of the standard http or http2 reply types.
 * It defaults to http.ServerResponse, and it also extends the relative reply object.
 */
export interface FastifyReply<
  Optional extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface,
  Generic extends FastifyInstanceRouteGenericInterface = OverrideRouteGeneric<Optional, DefaultFastifyInstanceRouteGenericInterface>,
  ReplyType extends FastifyReplyType = ResolveFastifyReplyType<Generic>
> {
  raw: GetReply<Generic>;
  context: FastifyContext<GetRouteContext<Generic>>;
  log: GetLogger<Generic>;
  request: FastifyRequest<Generic>;
  server: FastifyInstance<Generic>;
  code(statusCode: number): FastifyReply<Generic>;
  status(statusCode: number): FastifyReply<Generic>;
  statusCode: number;
  sent: boolean;
  send(payload?: ReplyType): FastifyReply<Generic>;
  header(key: string, value: any): FastifyReply<Generic>;
  headers(values: {[key: string]: any}): FastifyReply<Generic>;
  getHeader(key: string): string | undefined;
  getHeaders(): {
    // Node's `getHeaders()` can return numbers and arrays, so they're included here as possible types.
    [key: string]: number | string | string[] | undefined;
  };
  removeHeader(key: string): void;
  hasHeader(key: string): boolean;
  // Note: should consider refactoring the argument order for redirect. statusCode is optional so it should be after the required url param
  redirect(statusCode: number, url: string): FastifyReply<Generic>;
  redirect(url: string): FastifyReply<Generic>;
  hijack(): FastifyReply<Generic>;
  callNotFound(): void;
  getResponseTime(): number;
  type(contentType: string): FastifyReply<Generic>;
  serializer(fn: (payload: any) => string): FastifyReply<Generic>;
  serialize(payload: any): string;
  then(fulfilled: () => void, rejected: (err: Error) => void): void;
}
