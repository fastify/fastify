import { Buffer } from 'buffer'
import { FastifyReplyContext } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest } from './request'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { FastifyReplyType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyReplyType, CallTypeProvider } from './type-provider'
import { CodeToReplyKey, ContextConfigDefault, HttpKeys, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, ReplyDefault, ReplyKeysToCodes, HttpHeader } from './utils'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

type HttpCodesReplyType = Partial<Record<HttpKeys, unknown>>

type ReplyTypeConstrainer<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>> =
  RouteGenericReply extends HttpCodesReplyType & Record<Exclude<keyof RouteGenericReply, keyof HttpCodesReplyType>, never> ?
    Code extends keyof RouteGenericReply ? RouteGenericReply[Code] :
      CodeToReplyKey<Code> extends keyof RouteGenericReply ? RouteGenericReply[CodeToReplyKey<Code>] : unknown :
    RouteGenericReply;

export type ResolveReplyTypeWithRouteGeneric<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> =
  Code extends keyof SchemaCompiler['response'] ?
    CallTypeProvider<TypeProvider, SchemaCompiler['response'][Code]> :
    ResolveFastifyReplyType<TypeProvider, SchemaCompiler, { Reply: ReplyTypeConstrainer<RouteGenericReply, Code> }>
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
  context: FastifyReplyContext<ContextConfig>;
  elapsedTime: number;
  log: FastifyBaseLogger;
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>;
  server: FastifyInstance;
  code<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  status<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  statusCode: number;
  sent: boolean;
  send(payload?: ReplyType): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  header(key: HttpHeader, value: any): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  headers(values: Partial<Record<HttpHeader, number | string | string[] | undefined>>): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  getHeader(key: HttpHeader): number | string | string[] | undefined;
  getHeaders(): Record<HttpHeader, number | string | string[] | undefined>;
  removeHeader(key: HttpHeader): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hasHeader(key: HttpHeader): boolean;
  /**
   * @deprecated The `reply.redirect()` method has a new signature: `reply.reply.redirect(url: string, code?: number)`. It will be enforced in `fastify@v5`'.
   */
  redirect(statusCode: number, url: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  redirect(url: string, statusCode?: number): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hijack(): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  callNotFound(): void;
  /**
   * @deprecated Use the Reply#elapsedTime property instead
   */
  getResponseTime(): number;
  type(contentType: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  serializer(fn: (payload: any) => string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  serialize(payload: any): string | ArrayBuffer | Buffer;
  // Serialization Methods
  getSerializationFunction(httpStatus: string, contentType?: string): ((payload: {[key: string]: unknown}) => string) | undefined;
  getSerializationFunction(schema: {[key: string]: unknown}): ((payload: {[key: string]: unknown}) => string) | undefined;
  compileSerializationSchema(schema: {[key: string]: unknown}, httpStatus?: string, contentType?: string): (payload: {[key: string]: unknown}) => string;
  serializeInput(input: {[key: string]: unknown}, schema: {[key: string]: unknown}, httpStatus?: string, contentType?: string): string;
  serializeInput(input: {[key: string]: unknown}, httpStatus: string, contentType?: string): unknown;
  then(fulfilled: () => void, rejected: (err: Error) => void): void;
  trailer: (
    key: string,
    fn: ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null) => Promise<string>) | ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null, done: (err: Error | null, value?: string) => void) => void)
  ) => FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hasTrailer(key: string): boolean;
  removeTrailer(key: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
}
