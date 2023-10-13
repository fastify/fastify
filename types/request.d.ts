import { ErrorObject } from '@fastify/ajv-compiler'
import { FastifyContext, FastifyContextConfig } from './context'
import { FastifyInstance } from './instance'
import { FastifyBaseLogger } from './logger'
import { RouteGenericInterface, FastifyRouteConfig } from './route'
import { FastifySchema } from './schema'
import { FastifyRequestType, FastifyTypeProvider, FastifyTypeProviderDefault, ResolveFastifyRequestType } from './type-provider'
import { ContextConfigDefault, RawRequestDefaultExpression, RawServerBase, RawServerDefault, RequestBodyDefault, RequestHeadersDefault, RequestParamsDefault, RequestQuerystringDefault } from './utils'

type HTTPRequestPart = 'body' | 'query' | 'querystring' | 'params' | 'headers'
export interface RequestGenericInterface {
  Body?: RequestBodyDefault;
  Querystring?: RequestQuerystringDefault;
  Params?: RequestParamsDefault;
  Headers?: RequestHeadersDefault;
}

export interface ValidationFunction {
  (input: any): boolean
  errors?: null | ErrorObject[];
}

export interface RequestRouteOptions<ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema> {
  method: string;
  url: string;
  bodyLimit:number;
  attachValidation:boolean;
  logLevel:string;
  version: string | undefined;
  exposeHeadRoute: boolean;
  prefixTrailingSlash: string;
  config: FastifyContextConfig & FastifyRouteConfig & ContextConfig;
  schema: SchemaCompiler;
}

/**
 * FastifyRequest is an instance of the standard http or http2 request objects.
 * It defaults to http.IncomingMessage, and it also extends the relative request object.
 */
export type FastifyRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  ContextConfig = ContextConfigDefault,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  RequestType extends FastifyRequestType = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>,
  Decorator extends object | undefined = object
> = {
  id: string;
  params: RequestType['params']; // deferred inference
  raw: RawRequest;
  query: RequestType['query'];
  headers: RawRequest['headers'] & RequestType['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: Logger;
  server: FastifyInstance;
  body: RequestType['body'];
  context: FastifyContext<ContextConfig>;
  routeConfig: FastifyContext<ContextConfig>['config'];
  routeSchema: FastifySchema

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
  readonly originalUrl: string;
  readonly protocol: 'http' | 'https';
  readonly method: string;
  readonly routerPath: string;
  readonly routerMethod: string;
  readonly routeOptions: Readonly<RequestRouteOptions<ContextConfig, SchemaCompiler>>
  readonly is404: boolean;
  readonly socket: RawRequest['socket'];

  getValidationFunction(httpPart: HTTPRequestPart): ValidationFunction
  getValidationFunction(schema: {[key: string]: any}): ValidationFunction
  compileValidationSchema(schema: {[key: string]: any}, httpPart?: HTTPRequestPart): ValidationFunction
  validateInput(input: any, schema: {[key: string]: any}, httpPart?: HTTPRequestPart): boolean
  validateInput(input: any, httpPart?: HTTPRequestPart): boolean

  // Prefer `socket` over deprecated `connection` property in node 13.0.0 or higher
  // @deprecated
  readonly connection: RawRequest['socket'];
} & Decorator;
