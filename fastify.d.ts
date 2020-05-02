import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import * as LightMyRequest from 'light-my-request'

import { FastifyRequest } from './types/request'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './types/utils'
import { FastifyLoggerOptions } from './types/logger'
import { FastifyInstance } from './types/instance'
import { FastifyServerFactory } from './types/serverFactory'

/**
 * Fastify factor function for the standard fastify http, https, or http2 server instance.
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
  Logger = FastifyLoggerOptions<Server>,
>(opts: FastifyHttp2SecureOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger>
declare function fastify<
  Server extends http2.Http2Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger = FastifyLoggerOptions<Server>,
>(opts: FastifyHttp2Options<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger>
declare function fastify<
  Server extends https.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger = FastifyLoggerOptions<Server>,
>(opts: FastifyHttpsOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger>
declare function fastify<
  Server extends http.Server,
  Request extends RawRequestDefaultExpression<Server> = RawRequestDefaultExpression<Server>,
  Reply extends RawReplyDefaultExpression<Server> = RawReplyDefaultExpression<Server>,
  Logger = FastifyLoggerOptions<Server>,
>(opts?: FastifyServerOptions<Server, Logger>): FastifyInstance<Server, Request, Reply, Logger>
export default fastify

type FastifyHttp2SecureOptions<
  Server extends http2.Http2SecureServer,
  Logger
> = FastifyServerOptions<Server, Logger> & {
  http2: true,
  https: http2.SecureServerOptions
}

type FastifyHttp2Options<
  Server extends http2.Http2Server,
  Logger
> = FastifyServerOptions<Server, Logger> & {
  http2: true
}

type FastifyHttpsOptions<
  Server extends https.Server,
  Logger
> = FastifyServerOptions<Server, Logger> & {
  https: https.ServerOptions
}
/**
 * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
 */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  Logger = FastifyLoggerOptions<RawServer>
> = {
  ignoreTrailingSlash?: boolean,
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  bodyLimit?: number,
  pluginTimeout?: number,
  onProtoPoisoing?: 'error' | 'remove' | 'ignore',
  logger?: boolean | Logger,
  serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string,
  genReqId?: (req: FastifyRequest<RawServer, RawRequestDefaultExpression<RawServer>>) => string,
  trustProxy?: boolean | string | string[] | number | TrustProxyFunction,
  querystringParser?: (str: string) => { [key: string]: string | string[] },
  versioning?: {
    storage(): {
      get(version: string): Function | null,
      set(version: string, store: Function): void
      del(version: string): void,
      empty(): void
    },
    deriveVersion<Context>(req: Object, ctx?: Context): string // not a fan of using Object here. Also what is Context? Can either of these be better defined?
  }
}

type TrustProxyFunction = (address: string, hop: number) => boolean

/* Export all additional types */
export { FastifyRequest, FastifyRequestInterface, RequestGenericInterface } from './types/request'
export { FastifyReply, FastifyReplyInterface } from './types/reply'
export { FastifyPlugin, FastifyPluginOptions } from './types/plugin'
export { FastifyInstance } from './types/instance'
export { FastifyLoggerOptions, FastifyLogFn, LogLevels } from './types/logger'
export { FastifyContext } from './types/context'
export { RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export * from './types/register'
export { FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser } from './types/content-type-parser'
export { FastifyError, ValidationResult } from './types/error'
export { FastifySchema, FastifySchemaCompiler } from './types/schema'
export { HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault, ContextConfigDefault, RequestBodyDefault, RequestQuerystringDefault, RequestParamsDefault, RequestHeadersDefault } from './types/utils'
export * from './types/hooks'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
export { fastify }
