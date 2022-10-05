import { RawReplyDefaultExpression, RawServerBase, RawServerDefault, ContextConfigDefault, RawRequestDefaultExpression, ReplyDefault } from './utils'
import { FastifyReplyType, ResolveFastifyReplyType, FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { FastifyContext } from './context'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest } from './request'
import { RouteGenericInterface } from './route'
import { FastifyInstance } from './instance'
import { FastifySchema } from './schema'
import { Buffer } from 'buffer'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

/**
 * FastifyReply is an instance of the standard http or http2 reply types.
 * It defaults to http.ServerResponse, and it also extends the relative reply object.
 */
export interface FastifyReply<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ReplyType extends FastifyReplyType = ResolveFastifyReplyType<TypeProvider, SchemaCompiler, RouteGeneric>
> {
  raw: RawReply;
  context: FastifyContext<ContextConfig>;
  log: FastifyBaseLogger;
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>;
  server: FastifyInstance;
  code(statusCode: number): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  status(statusCode: number): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  statusCode: number;
  sent: boolean;
  send(payload?: ReplyType): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  header(key: string, value: any): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  headers(values: {[key: string]: any}): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  getHeader(key: string): number | string | string[] | undefined;
  getHeaders(): {
    // Node's `getHeaders()` can return numbers and arrays, so they're included here as possible types.
    [key: string]: number | string | string[] | undefined;
  };
  removeHeader(key: string): void;
  hasHeader(key: string): boolean;
  // Note: should consider refactoring the argument order for redirect. statusCode is optional so it should be after the required url param
  redirect(statusCode: number, url: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  redirect(url: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hijack(): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  callNotFound(): void;
  getResponseTime(): number;
  type(contentType: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  serializer(fn: (payload: any) => string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  serialize(payload: any): string | ArrayBuffer | Buffer;
  // Serialization Methods
  getSerializationFunction(httpStatus: string, contentType?: string): (payload: {[key: string]: unknown}) => string;
  getSerializationFunction(schema: {[key: string]: unknown}): (payload: {[key: string]: unknown}) => string;
  compileSerializationSchema(schema: {[key: string]: unknown}, httpStatus?: string, contentType?: string): (payload: {[key: string]: unknown}) => string;
  serializeInput(input: {[key: string]: unknown}, schema: {[key: string]: unknown}, httpStatus?: string, contentType?: string): string;
  serializeInput(input: {[key: string]: unknown}, httpStatus: string, contentType?: string): unknown;
  then(fulfilled: () => void, rejected: (err: Error) => void): void;
}
