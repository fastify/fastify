import { FastifyLoggerInstance } from './logger'
import { ContextConfigDefault, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'
import { RouteGenericInterface } from './route'
import { FastifyInstance } from './instance'
import { FastifyTypeProvider, FastifyTypeProviderDefault, CallTypeProvider } from './type-provider'
import { FastifySchema } from './schema'
import { FastifyContext } from './context'

export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
}

/** Request context target type. Undefined always resolve to unknown */
export interface FastifyRequestContext<Params = unknown, Querystring = unknown, Headers = unknown, Body = unknown> {
  params: Params,
  query: Querystring,
  headers: Headers,
  body: Body
}

type UndefinedToUnknown<T> = T extends undefined ? unknown : T

/**
 * This type handles request context resolution either via generic arguments
 * or type provider. If the user specifies both generic arguments as well as
 * a type provider, this type will override the type provider and use the
 * generic arguments. This enables users to override undesirable inference
 * behaviours in the type provider.
 */
export type ResolveFastifyRequestContext<
  TypeProvider extends FastifyTypeProvider,
  SchemaCompiler extends FastifySchema,
  RouteGeneric extends RouteGenericInterface
> = FastifyRequestContext<
UndefinedToUnknown<keyof RouteGeneric['Params'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['params']>: RouteGeneric['Params']>,
UndefinedToUnknown<keyof RouteGeneric['Querystring'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['querystring']> : RouteGeneric['Querystring']>,
UndefinedToUnknown<keyof RouteGeneric['Headers'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['headers']> : RouteGeneric['Headers']>,
UndefinedToUnknown<keyof RouteGeneric['Body'] extends never ? CallTypeProvider<TypeProvider, SchemaCompiler['body']> : RouteGeneric['Body']>
>

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export interface FastifyRequest<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ContextConfig = ContextConfigDefault,
  Context extends FastifyRequestContext = ResolveFastifyRequestContext<TypeProvider, SchemaCompiler, RouteGeneric>
> {
  id: any;
  params: Context['params'];
  raw: RawRequest;
  query: Context['query'];
  headers: RawRequest['headers'] & Context['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: FastifyLoggerInstance;
  server: FastifyInstance;
  body: Context['body'];
  context: FastifyContext<ContextConfig>;

  /** in order for this to be used the user should ensure they have set the attachValidation option. */
  validationError?: Error & { validation: any; validationContext: string };

  /**
   * @deprecated Use `raw` property
   */
  readonly req: RawRequest & RouteGeneric['Headers']; // this enables the developer to extend the existing http(s|2) headers list
  readonly ip: string;
  readonly ips?: string[];
  readonly hostname: string;
  readonly url: string;
  readonly protocol: 'http' | 'https';
  readonly method: string;
  readonly routerPath: string;
  readonly routerMethod: string;
  readonly is404: boolean;
  readonly socket: RawRequest['socket'];

  // Prefer `socket` over deprecated `connection` property in node 13.0.0 or higher
  // @deprecated
  readonly connection: RawRequest['socket'];
}
