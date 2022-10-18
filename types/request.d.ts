import { ErrorObject } from '@fastify/ajv-compiler'
import { FastifyBaseLogger } from './logger'
import { ContextConfigDefault, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './utils'
import { RouteGenericInterface } from './route'
import { FastifyInstance } from './instance'
import { FastifyTypeProvider, FastifyTypeProviderDefault, FastifyRequestType, ResolveFastifyRequestType } from './type-provider'
import { FastifySchema } from './schema'
import { FastifyContext, FastifyContextConfig } from './context'

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
  RequestType extends FastifyRequestType = ResolveFastifyRequestType<TypeProvider, SchemaCompiler, RouteGeneric>
  // ^ Temporary Note: RequestType has been re-ordered to be the last argument in
  //   generic list. This generic argument is now considered optional as it can be
  //   automatically inferred from the SchemaCompiler, RouteGeneric and TypeProvider
  //   arguments. Implementations that already pass this argument can either omit
  //   the RequestType (preferred) or swap Logger and RequestType arguments when
  //   creating custom types of FastifyRequest. Related issue #4123
> {
  id: any;
  params: RequestType['params']; // deferred inference
  raw: RawRequest;
  query: RequestType['query'];
  headers: RawRequest['headers'] & RequestType['headers']; // this enables the developer to extend the existing http(s|2) headers list
  log: Logger;
  server: FastifyInstance;
  body: RequestType['body'];
  context: FastifyContext<ContextConfig>;
  routeConfig: FastifyContextConfig & ContextConfig;
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
  readonly protocol: 'http' | 'https';
  readonly method: string;
  readonly routerPath: string;
  readonly routerMethod: string;
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
}
