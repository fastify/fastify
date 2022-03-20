import { FastifyLoggerInstance } from './logger'
import { ContextConfigDefault, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'
import { RouteGenericInterface } from './route'
import { FastifyInstance } from './instance'
import { FastifyTypeProvider, FastifyTypeProviderDefault, FastifyRequestType, ResolveFastifyRequestType } from './type-provider'
import { FastifySchema } from './schema'
import { FastifyContext } from './context'

export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
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
  RequestType extends FastifyRequestType = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> {
  id: any;
  params: RequestType['params'];
  raw: RawRequest;
  query: RequestType['query'];
  headers: RawRequest['headers'] & RequestType['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: Logger;
  server: FastifyInstance;
  body: RequestType['body'];
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
