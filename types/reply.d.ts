import { Buffer } from 'node:buffer'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRequest, FastifyRequestForRoute, RequestRouteOptions } from './request'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { CallSerializerTypeProvider, FastifyReplyType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyReplyType, SendArgs } from './type-provider'
import { CodeToReplyKey, ContextConfigDefault, HttpHeader, HttpKeys, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, ReplyDefault, ReplyKeysToCodes } from './utils'

export interface ReplyGenericInterface {
  Reply?: ReplyDefault;
}

type HttpCodesReplyType = Partial<Record<HttpKeys, unknown>>

type ReplyTypeConstrainer<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>> =
  RouteGenericReply extends HttpCodesReplyType &
  Record<Exclude<keyof RouteGenericReply, keyof HttpCodesReplyType>, never> ?
    Code extends keyof RouteGenericReply ? RouteGenericReply[Code] :
      CodeToReplyKey<Code> extends keyof RouteGenericReply ? RouteGenericReply[CodeToReplyKey<Code>] : unknown :
    RouteGenericReply

export type ResolveReplyTypeWithRouteGeneric<RouteGenericReply, Code extends ReplyKeysToCodes<keyof RouteGenericReply>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault> =
  Code extends keyof SchemaCompiler['response'] ?
    CallSerializerTypeProvider<TypeProvider, SchemaCompiler['response'][Code]> :
    ResolveFastifyReplyType<TypeProvider, SchemaCompiler, { Reply: ReplyTypeConstrainer<RouteGenericReply, Code> }>

type ReplyStatusCode<RouteReply, SchemaCompiler extends FastifySchema> = keyof SchemaCompiler['response'] extends never
  ? ReplyKeysToCodes<keyof RouteReply>
  : keyof SchemaCompiler['response'] extends ReplyKeysToCodes<keyof RouteReply>
    ? keyof SchemaCompiler['response']
    : ReplyKeysToCodes<keyof RouteReply>

type FastifyReplyBase<
  RouteGeneric extends RouteGenericInterface,
  RawServer extends RawServerBase,
  RawRequest extends RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer>,
  ContextConfig,
  SchemaCompiler extends FastifySchema,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger,
  RequestView,
  ServerInstance
> = FastifyReply<
  RouteGeneric,
  RawServer,
  RawRequest,
  RawReply,
  ContextConfig,
  SchemaCompiler,
  TypeProvider,
  ResolveFastifyReplyType<TypeProvider, SchemaCompiler, RouteGeneric>,
  Logger,
  RequestView,
  ServerInstance
>

type FastifyReplyAfterStatus<
  RouteGeneric extends RouteGenericInterface,
  Code extends ReplyKeysToCodes<keyof RouteGeneric['Reply']>,
  RawServer extends RawServerBase,
  RawRequest extends RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer>,
  ContextConfig,
  SchemaCompiler extends FastifySchema,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger,
  RequestView,
  ServerInstance
> = FastifyReply<
  RouteGeneric,
  RawServer,
  RawRequest,
  RawReply,
  ContextConfig,
  SchemaCompiler,
  TypeProvider,
  ResolveReplyTypeWithRouteGeneric<RouteGeneric['Reply'], Code, SchemaCompiler, TypeProvider>,
  Logger,
  RequestView,
  ServerInstance
>
/**
 * FastifyReply is an instance of the standard http or http2 reply types.
 * It defaults to http.ServerResponse, and it also extends the relative reply object.
 */
export interface FastifyReply<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ReplyType extends FastifyReplyType = ResolveFastifyReplyType<TypeProvider, SchemaCompiler, RouteGeneric>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  RequestView = FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig,
    Logger>,
  ServerInstance = FastifyInstance
> {
  readonly routeOptions: Readonly<RequestRouteOptions<ContextConfig, SchemaCompiler>>

  raw: RawReply;
  elapsedTime: number;
  log: Logger;
  request: RequestView;
  server: ServerInstance;
  code<Code extends ReplyStatusCode<RouteGeneric['Reply'], SchemaCompiler>>(
    statusCode: Code
  ): FastifyReplyAfterStatus<
    RouteGeneric,
    Code,
    RawServer,
    RawRequest,
    RawReply,
    ContextConfig,
    SchemaCompiler,
    TypeProvider,
    Logger,
    RequestView,
    ServerInstance
  >;
  status<Code extends ReplyStatusCode<RouteGeneric['Reply'], SchemaCompiler>>(
    statusCode: Code
  ): FastifyReplyAfterStatus<
    RouteGeneric,
    Code,
    RawServer,
    RawRequest,
    RawReply,
    ContextConfig,
    SchemaCompiler,
    TypeProvider,
    Logger,
    RequestView,
    ServerInstance
  >;
  statusCode: number;
  sent: boolean;
  send(
    ...args: SendArgs<ReplyType>
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  header(
    key: HttpHeader,
    value: unknown
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  headers(
    values: Partial<Record<HttpHeader, number | string | string[] | undefined>>
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  getHeader(key: HttpHeader): number | string | string[] | undefined;
  getHeaders(): Record<HttpHeader, number | string | string[] | undefined>;
  removeHeader(
    key: HttpHeader
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  hasHeader(key: HttpHeader): boolean;
  redirect(
    url: string,
    statusCode?: number
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  writeEarlyHints(hints: Record<string, string | string[]>, callback?: () => void): void;
  hijack(): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  callNotFound(): void;
  type(
    contentType: string
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  serializer(
    fn: (payload: any) => string
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  serialize(payload: any): string | ArrayBuffer | Buffer;
  // Serialization Methods
  getSerializationFunction(
    httpStatus: string,
    contentType?: string
  ): ((payload: { [key: string]: unknown }) => string) | undefined;
  getSerializationFunction(
    schema: { [key: string]: unknown }
  ): ((payload: { [key: string]: unknown }) => string) | undefined;
  compileSerializationSchema(
    schema: { [key: string]: unknown },
    httpStatus?: string,
    contentType?: string
  ): (payload: { [key: string]: unknown }) => string;
  serializeInput(
    input: { [key: string]: unknown },
    schema: { [key: string]: unknown },
    httpStatus?: string,
    contentType?: string
  ): string;
  serializeInput(input: { [key: string]: unknown }, httpStatus: string, contentType?: string): unknown;
  then(fulfilled: () => void, rejected: (err: Error) => void): void;
  trailer: (
    key: string,
    fn:
      | ((
        reply: FastifyReplyBase<
            RouteGeneric,
            RawServer,
            RawRequest,
            RawReply,
            ContextConfig,
            SchemaCompiler,
            TypeProvider,
            Logger,
            RequestView,
            ServerInstance
          >,
        payload: string | Buffer | null
      ) => Promise<string>)
      | ((
        reply: FastifyReplyBase<
            RouteGeneric,
            RawServer,
            RawRequest,
            RawReply,
            ContextConfig,
            SchemaCompiler,
            TypeProvider,
            Logger,
            RequestView,
            ServerInstance
          >,
        payload: string | Buffer | null,
        done: (err: Error | null, value?: string) => void
      ) => void)
  ) => FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  hasTrailer(key: string): boolean;
  removeTrailer(
    key: string
  ): FastifyReplyBase<RouteGeneric, RawServer, RawRequest, RawReply, ContextConfig, SchemaCompiler, TypeProvider,
    Logger, RequestView, ServerInstance>;
  getDecorator<T>(name: string | symbol): T;
}

/** Constructs the reply view shared by routes and hooks. */
export type FastifyReplyForRoute<
  RouteGeneric extends RouteGenericInterface,
  RawServer extends RawServerBase,
  RawRequest extends RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer>,
  ContextConfig,
  SchemaCompiler extends FastifySchema,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger
> = FastifyReply<
  RouteGeneric,
  RawServer,
  RawRequest,
  RawReply,
  ContextConfig,
  SchemaCompiler,
  TypeProvider,
  ResolveFastifyReplyType<TypeProvider, SchemaCompiler, RouteGeneric>,
  Logger,
  FastifyRequestForRoute<RouteGeneric, RawServer, RawRequest, RawReply, SchemaCompiler, TypeProvider, ContextConfig,
    Logger>,
  FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
>
