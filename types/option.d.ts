import { Options as AjvOptions, ValidatorCompiler } from '@fastify/ajv-compiler'
import { Options as FJSOptions, SerializerCompiler } from '@fastify/fast-json-stringify-compiler'
import { FastifyError } from 'fastify-error'
import { ConstraintStrategy, HTTPVersion } from 'find-my-way'
import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import { Socket } from 'net'
import { ConstructorAction, ProtoAction } from './content-type-parser'
import { FastifyInstance, FastifyInstanceGenericInterface, FastifyInstanceHttp2GenericInterface, FastifyInstanceHttp2SecureGenericInterface, FastifyInstanceHttpsGenericInterface } from './instance'
import { FastifyLoggerOptions, PinoLoggerOptions } from './logger'
import { FastifyReply } from './reply'
import { FastifyRequest } from './request'
import { DefaultFastifyInstanceRouteGenericOnlyInterface, FastifyInstanceRouteGenericOnlyInterface } from './route'
import { FastifySchemaValidationError } from './schema'
import { GetRequest, GetServer } from './utils'

type FindMyWayVersion<Generic extends FastifyInstanceGenericInterface, RawServer = GetServer<Generic>> = RawServer extends http.Server ? HTTPVersion.V1 : HTTPVersion.V2

export interface ConnectionError extends Error {
  code: string,
  bytesParsed: number,
  rawPacket: {
    type: string,
    data: number[]
  }
}

type TrustProxyFunction = (address: string, hop: number) => boolean

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
  onProtoPoisoning?: ProtoAction,
  onConstructorPoisoning?: ConstructorAction,
  logger?: boolean | FastifyLoggerOptions<Generic> & PinoLoggerOptions | Generic['Logger'],
  serializerOpts?: FJSOptions | Record<string, unknown>,
  // serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string,
  requestIdLogLabel?: string;
  genReqId?: <
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(req: FastifyRequest<Generic & RouteGeneric>) => string,
  trustProxy?: boolean | string | string[] | number | TrustProxyFunction,
  querystringParser?: (str: string) => { [key: string]: unknown },
  /**
   * @deprecated Prefer using the `constraints.version` property
   */
  versioning?: {
    storage(): {
      get(version: string): string | null,
      // eslint-disable-next-line @typescript-eslint/ban-types
      set(version: string, store: Function): void
      del(version: string): void,
      empty(): void
    },
    // eslint-disable-next-line @typescript-eslint/ban-types
    deriveVersion<Context>(req: Object, ctx?: Context): string // not a fan of using Object here. Also what is Context? Can either of these be better defined?
  },
  constraints?: {
    [name: string]: ConstraintStrategy<FindMyWayVersion<Generic>, unknown>,
  },
  schemaController?: {
    bucket?: (parentSchemas?: unknown) => {
      addSchema(schema: unknown): FastifyInstance;
      getSchema(schemaId: string): unknown;
      getSchemas(): Record<string, unknown>;
    };
    compilersFactory?: {
      buildValidator?: ValidatorCompiler;
      buildSerializer?: SerializerCompiler;
    };
  };
  return503OnClosing?: boolean,
  ajv?: {
    customOptions?: AjvOptions,
    // eslint-disable-next-line @typescript-eslint/ban-types
    plugins?: Function[]
  },
  frameworkErrors?: <
    RouteGeneric extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface
  >(
    error: FastifyError,
    req: FastifyRequest<Generic & RouteGeneric>,
    res: FastifyReply<Generic & RouteGeneric>
  ) => void,
  rewriteUrl?: (req: GetRequest<Generic>) => string,
  schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error,
  /**
   * listener to error events emitted by client connections
   */
  clientErrorHandler?: (error: ConnectionError, socket: Socket) => void
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

export interface PrintRoutesOptions {
  includeMeta?: boolean | (string | symbol)[]
  commonPrefix?: boolean
  includeHooks?: boolean
}
