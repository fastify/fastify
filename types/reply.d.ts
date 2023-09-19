import { Buffer } from 'buffer'
import { FastifyContext } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest } from './request'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { FastifyReplyType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyReplyType } from './type-provider'
import { CodeToReplyKey, ContextConfigDefault, HttpKeys, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, ReplyDefault, ReplyKeysToCodes } from './utils'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

type HttpCodesReplyType = Partial<Record<HttpKeys, unknown>>

type HttpHeader = 'accept' | 'accept-charset' | 'accept-encoding' | 'accept-language' | 'accept-ranges' | 'access-control-allow-credentials' | 'access-control-allow-headers' | 'access-control-allow-methods' | 'access-control-allow-origin' | 'access-control-expose-headers' | 'access-control-max-age' | 'access-control-request-headers' | 'access-control-request-method' | 'age' | 'allow' | 'authorization' | 'cache-control' | 'cdn-cache-control' | 'connection' | 'content-disposition' | 'content-encoding' | 'content-language' | 'content-length' | 'content-location' | 'content-range' | 'content-security-policy' | 'content-security-policy-report-only' | 'cookie' | 'dnt' | 'date' | 'etag' | 'expect' | 'expires' | 'forwarded' | 'from' | 'host' | 'if-match' | 'if-modified-since' | 'if-none-match' | 'if-range' | 'if-unmodified-since' | 'last-modified' | 'link' | 'location' | 'max-forwards' | 'origin' | 'prgama' | 'proxy-authenticate' | 'proxy-authorization' | 'public-key-pins' | 'public-key-pins-report-only' | 'range' | 'referer' | 'referrer-policy' | 'refresh' | 'retry-after' | 'sec-websocket-accept' | 'sec-websocket-extensions' | 'sec-websocket-key' | 'sec-websocket-protocol' | 'sec-websocket-version' | 'server' | 'set-cookie' | 'strict-transport-security' | 'te' | 'trailer' | 'transfer-encoding' | 'user-agent' | 'upgrade' | 'upgrade-insecure-requests' | 'vary' | 'via' | 'warning' | 'www-authenticate' | 'x-content-type-options' | 'x-dns-prefetch-control' | 'x-frame-options' | 'x-xss-protection' | string;

type ReplyTypeConstrainer<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>> =
  RouteGenericReply extends HttpCodesReplyType & Record<Exclude<keyof RouteGenericReply, keyof HttpCodesReplyType>, never> ?
    Code extends keyof RouteGenericReply ? RouteGenericReply[Code] :
      CodeToReplyKey<Code> extends keyof RouteGenericReply ? RouteGenericReply[CodeToReplyKey<Code>] : unknown :
    RouteGenericReply;

export type ResolveReplyTypeWithRouteGeneric<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> =
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
  context: FastifyContext<ContextConfig>;
  log: FastifyBaseLogger;
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider>;
  server: FastifyInstance;
  code<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  status<Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>>(statusCode: Code): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>>;
  statusCode: number;
  sent: boolean;
  send(payload?: ReplyType): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  header(key: HttpHeader, value: any): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  headers(values: {[key: HttpHeader]: any}): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  getHeader(key: HttpHeader): number | string | string[] | undefined;
  getHeaders(): {
    // Node's `getHeaders()` can return numbers and arrays, so they're included here as possible types.
    [key: HttpHeader]: number | string | string[] | undefined;
  };
  removeHeader(key: HttpHeader): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hasHeader(key: HttpHeader): boolean;
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
  trailer: (
    key: string,
    fn: ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null) => Promise<string>) | ((reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>, payload: string | Buffer | null, done: (err: Error | null, value?: string) => void) => void)
  ) => FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
  hasTrailer(key: string): boolean;
  removeTrailer(key: string): FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>;
}
