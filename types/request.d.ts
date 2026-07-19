import { ErrorObject } from '@fastify/ajv-compiler'
import { FastifyContextConfig } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { FastifyRouteConfig, RouteGenericInterface, RouteHandlerMethod } from './route'
import { FastifySchema } from './schema'
import { FastifyRequestType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyRequestType } from './type-provider'
import { ContextConfigDefault, HTTPMethods, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, RequestBodyDefault, RequestHeadersDefault, RequestParamsDefault, RequestQuerystringDefault } from './utils'

type HTTPRequestPart = 'body' | 'query' | 'querystring' | 'params' | 'headers'
export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
}

export interface ValidationFunction<Input = unknown> {
  (input: Input): boolean
  errors?: null | ErrorObject[];
}

export interface RequestRouteOptions<ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema> {
  method: HTTPMethods | HTTPMethods[];
  // `url` can be `undefined` for instance when `request.is404` is true
  url: string | undefined;
  bodyLimit: number;
  handlerTimeout: number;
  attachValidation: boolean;
  logLevel: string;
  exposeHeadRoute: boolean;
  prefixTrailingSlash: string;
  config: FastifyContextConfig & FastifyRouteConfig & ContextConfig;
  schema?: SchemaCompiler; // it is empty for 404 requests
  handler: RouteHandlerMethod;
  version?: string;
}

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export interface FastifyRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ContextConfig = ContextConfigDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  RequestType extends FastifyRequestType = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>,
  ServerInstance = FastifyInstance
// ^ Temporary Note: RequestType has been re-ordered to be the last argument in
//   the historical generic list. This generic argument is optional as it can be
//   automatically inferred from the SchemaCompiler, RouteGeneric and TypeProvider
//   arguments. ServerInstance was appended later so existing RequestType positions
//   stay compatible. Related issue #4123
> {
  id: string;
  params: RequestType['params']; // deferred inference
  raw: RawRequest;
  query: RequestType['query'];
  headers: RawRequest['headers'] & RequestType['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: Logger;
  server: ServerInstance;
  body: RequestType['body'];

  /**
   * In order for this to be used the user should set `attachValidation`.
   * `validation` remains `any` for exact Fastify 5 compatibility.
   */
  validationError?: Error & { validation: any; validationContext: string };

  /**
   * @deprecated Use `raw` property
   */
  readonly req: RawRequest & RouteGeneric['Headers']; // this enables the developer to extend the existing http(s|2) headers list
  /**
   * Derived from request socket metadata or forwarding headers.
   * Treat as untrusted input and validate before security-sensitive use.
   */
  readonly ip: string;
  /**
   * Derived from forwarding headers when trustProxy is enabled.
   * Treat as untrusted input and validate before security-sensitive use.
   */
  readonly ips?: string[];
  /**
   * Derived from Host/:authority/X-Forwarded-Host request metadata.
   * Treat as untrusted input and validate before security-sensitive use.
   */
  readonly host: string;
  /**
   * Parsed from request host metadata.
   * Treat as untrusted input and validate before security-sensitive use.
   */
  readonly port: number | null;
  readonly hostname: string;
  readonly url: string;
  readonly originalUrl: string;
  /**
   * Derived from socket state or forwarding headers.
   * Treat as untrusted input and validate before security-sensitive use.
   */
  readonly protocol: 'http' | 'https';
  readonly method: string;
  readonly routeOptions: Readonly<RequestRouteOptions<ContextConfig, SchemaCompiler>>
  readonly is404: boolean;
  readonly socket: RawRequest['socket'];
  readonly signal: AbortSignal;
  readonly mediaType: string | undefined;

  getValidationFunction(httpPart: HTTPRequestPart): ValidationFunction | undefined
  getValidationFunction(schema: Record<string, unknown>): ValidationFunction | undefined
  compileValidationSchema(schema: Record<string, unknown>, httpPart?: HTTPRequestPart): ValidationFunction
  validateInput(input: unknown, schema: Record<string, unknown>, httpPart?: HTTPRequestPart): boolean
  validateInput(input: unknown, httpPart?: HTTPRequestPart): boolean
  getDecorator<T>(name: string | symbol): T;
  setDecorator<T = unknown>(name: string | symbol, value: T): void;
}

/** Constructs the request view shared by routes, hooks, and replies. */
export type FastifyRequestForRoute<
  RouteGeneric extends RouteGenericInterface,
  RawServer extends RawServerBase,
  RawRequest extends RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer>,
  SchemaCompiler extends FastifySchema,
  TypeProvider extends FastifyTypeProvider,
  ContextConfig,
  Logger extends FastifyBaseLogger
> = FastifyRequest<
  RouteGeneric,
  RawServer,
  RawRequest,
  SchemaCompiler,
  TypeProvider,
  ContextConfig,
  Logger,
  ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>,
  FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>
>
