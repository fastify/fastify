import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

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
export default function fastify<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>
>(opts?: FastifyServerOptions<RawServer, Logger>): FastifyInstance<RawServer, RawRequest, RawReply, Logger>;

/**
 * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
 */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  Logger = FastifyLoggerOptions<RawServer>
> = {
  http2?: RawServer extends http2.Http2Server ? true : false,
  https?: RawServer extends https.Server 
    ? https.ServerOptions
    : RawServer extends http2.Http2SecureServer
      ? http2.SecureServerOptions
      : null,
  ignoreTrailingSlash?: boolean,
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
export { FastifyRequest } from './types/request'
export { FastifyReply } from './types/reply'
export { FastifyPlugin, FastifyPluginOptions } from './types/plugin'
export { FastifyInstance } from './types/instance'
export { FastifyLoggerOptions, FastifyLogFn, LogLevels } from './types/logger'
export { FastifyMiddleware, FastifyMiddlewareWithPayload } from './types/middleware'
export { FastifyContext } from './types/context'
export { RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export { RegisterOptions } from './types/register'
export { FastifyBodyParser, FastifyContentTypeParser, AddContentTypeParser, hasContentTypeParser } from './types/content-type-parser'
export { FastifyError, ValidationResult } from './types/error'
export { FastifySchema, FastifySchemaCompiler } from './types/schema'
export { HTTPMethods, RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression, RawServerDefault } from './types/utils'
export { onCloseHookHandler, onRouteHookHandler, onRequestHookHandler, onSendHookHandler, onErrorHookHandler, preHandlerHookHandler, preParsingHookHandler, preSerializationHookHandler, preValidationHookHandler, AddHook, addHookHandler } from './types/hooks'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
export { fastify }
