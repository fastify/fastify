import * as http2 from 'http2'
import * as https from 'https'
import { FastifyInstanceHttp2GenericInterface, FastifyInstanceHttp2SecureGenericInterface, FastifyInstanceHttpsGenericInterface } from './fastify'
import { FastifyLoggerOptions, PinoLoggerOptions } from './logger'
import { FastifyInstanceGenericInterface } from './utils'

export interface FastifyServerOptions<Generic extends FastifyInstanceGenericInterface> {
  ignoreTrailingSlash?: boolean,
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  maxRequestsPerSocket?: number,
  requestTimeout?: number,
  pluginTimeout?: number,
  bodyLimit?: number,
  maxParamLength?: number,
  disableRequestLogging?: boolean,
  exposeHeadRoutes?: boolean,
  // onProtoPoisoning?: ProtoAction,
  // onConstructorPoisoning?: ConstructorAction,
  logger?: boolean | FastifyLoggerOptions<Generic> & PinoLoggerOptions | Generic["Logger"],
  // serializerOpts?: FJSOptions | Record<string, unknown>,
  // serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string,
  requestIdLogLabel?: string;
  // genReqId?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault>(req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, TypeProvider>) => string,
  // trustProxy?: boolean | string | string[] | number | TrustProxyFunction,
  querystringParser?: (str: string) => { [key: string]: unknown },
  /**
   * @deprecated Prefer using the `constraints.version` property
   */
  versioning?: {
    storage(): {
      get(version: string): string | null,
      set(version: string, store: Function): void
      del(version: string): void,
      empty(): void
    },
    deriveVersion<Context>(req: Object, ctx?: Context): string // not a fan of using Object here. Also what is Context? Can either of these be better defined?
  },
  // constraints?: {
  //   [name: string]: ConstraintStrategy<FindMyWayVersion<RawServer>, unknown>,
  // },
  // schemaController?: {
  //   bucket?: (parentSchemas?: unknown) => {
  //     addSchema(schema: unknown): FastifyInstance;
  //     getSchema(schemaId: string): unknown;
  //     getSchemas(): Record<string, unknown>;
  //   };
  //   compilersFactory?: {
  //     buildValidator?: ValidatorCompiler;
  //     buildSerializer?: SerializerCompiler;
  //   };
  // };
  return503OnClosing?: boolean,
  // ajv?: {
  //   customOptions?: AjvOptions,
  //   plugins?: Function[]
  // },
  // frameworkErrors?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, SchemaCompiler extends FastifySchema = FastifySchema>(
  //   error: FastifyError,
  //   req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, TypeProvider>,
  //   res: FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>, RequestGeneric, FastifyContextConfig, SchemaCompiler, TypeProvider>
  // ) => void,
  // rewriteUrl?: (req: RawRequestDefaultExpression<RawServer>) => string,
  // schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error,
  // /**
  //  * listener to error events emitted by client connections
  //  */
  // clientErrorHandler?: (error: ConnectionError, socket: Socket) => void
}

export type FastifyHttp2SecureOptions<Generic extends FastifyInstanceHttp2SecureGenericInterface> = FastifyServerOptions<Generic> & {
  http2: true,
  https: http2.SecureServerOptions,
  http2SessionTimeout?: number
}

export type FastifyHttp2Options<Generic extends FastifyInstanceHttp2GenericInterface> = FastifyServerOptions<Generic> & {
  http2: true,
  http2SessionTimeout?: number
}

export type FastifyHttpsOptions<Generic extends FastifyInstanceHttpsGenericInterface> = FastifyServerOptions<Generic> & {
  https: https.ServerOptions
}