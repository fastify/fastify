import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import * as LightMyRequest from 'light-my-request'

import { FastifyRequest, RequestGenericInterface } from './types/request'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './types/utils'
import { FastifyLoggerInstance, FastifyLoggerOptions } from './types/logger'
import { FastifyInstance } from './types/instance'
import { FastifyServerFactory } from './types/serverFactory'
import * as ajv from 'ajv'
import { FastifyError } from 'fastify-error'
import { FastifyReply } from './types/reply'
import { FastifySchemaValidationError } from './types/schema'

/**
 * Fastify factory function for the standard fastify http, https, or http2 server instance.
 *
 * The default function utilizes http
 *
 * @param opts Fastify server options
 * @returns Fastify server instance
 */
declare function fastify<
  Server extends http2.Http2SecureServer,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
>(opts: FastifyHttp2SecureOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger>>
declare function fastify<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
>(opts: FastifyHttp2Options<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger>>
declare function fastify<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
>(opts: FastifyHttpsOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger>>
declare function fastify<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
>(opts?: FastifyServerOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger> & PromiseLike<FastifyInstance<Server, Request, Reply, Logger>>
export default fastify

export type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true,
  https: http2.SecureServerOptions
}

export type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  http2: true,
  http2SessionTimeout?: number,
}

export type FastifyHttpsOptions<
  Server extends https.Server,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions
}
/**
 * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
 */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = {
  ignoreTrailingSlash?: boolean,
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  pluginTimeout?: number,
  bodyLimit?: number,
  maxParamLength?: number,
  disableRequestLogging?: boolean,
  exposeHeadRoutes?: boolean,
  onProtoPoisoning?: 'error' | 'remove' | 'ignore',
  onConstructorPoisoning?: 'error' | 'remove' | 'ignore',
  logger?: boolean | FastifyLoggerOptions<RawServer> | Logger,
  serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string,
  requestIdLogLabel?: string;
  genReqId?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface>(req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>>) => string,
  trustProxy?: boolean | string | string[] | number | TrustProxyFunction,
  querystringParser?: (str: string) => { [key: string]: unknown },
  versioning?: {
    storage(): {
      get(version: string): string | null,
      set(version: string, store: Function): void
      del(version: string): void,
      empty(): void
    },
    deriveVersion<Context>(req: Object, ctx?: Context): string // not a fan of using Object here. Also what is Context? Can either of these be better defined?
  },
  return503OnClosing?: boolean,
  ajv?: {
    customOptions?: ajv.Options,
    plugins?: Function[]
  },
  frameworkErrors?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface>(
    error: FastifyError,
    req: FastifyRequest<RequestGeneric, RawServer, RawRequestDefaultExpression<RawServer>>,
    res: FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>>
  ) => void,
  rewriteUrl?: (req: RawRequestDefaultExpression<RawServer>) => string,
  schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error
}

type TrustProxyFunction = (address: string, hop: number) => boolean

declare module 'fastify-error' {
  interface FastifyError {
    validation?: ValidationResult[];
  }
}

export interface ValidationResult {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: Record<string, string | string[]>;
  message: string;
}

/* Export all additional types */
export { FastifyRequest, RequestGenericInterface } from './types/request'
export { FastifyReply } from './types/reply'
export { FastifyPluginCallback, FastifyPluginAsync, FastifyPluginOptions, FastifyPlugin } from './types/plugin'
export { FastifyInstance } from './types/instance'
export { FastifyLoggerOptions, FastifyLoggerInstance, FastifyLogFn, LogLevel } from './types/logger'
export { FastifyContext } from './types/context'
export { RouteHandler, RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export * from './types/register'
export { FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser } from './types/content-type-parser'
export { FastifyError } from 'fastify-error'
export { FastifySchema, FastifySchemaCompiler } from './types/schema'
export { HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault, ContextConfigDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './types/utils'
export * from './types/hooks'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
export { fastify }
