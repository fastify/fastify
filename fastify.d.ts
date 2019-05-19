import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyRequest } from './types/request'
import { RawServerBase, RawServerDefault, RawRequestDefault, RawReplyDefault, RawRequestBase, RawReplyBase } from './types/utils'
import { FastifyLoggerOptions, PinoObject } from './types/logger'
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
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
>(opts?: FastifyServerOptions<RawServer>): FastifyInstance<RawServer, RawRequest, RawReply>;

/**
 * Options for a fastify server instance. Utilizes conditional logic on the generic server parameter to enforce certain https and http2
 */
export type FastifyServerOptions<
  RawServer extends RawServerBase = RawServerDefault,
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
  logger?: boolean | FastifyLoggerOptions<RawServer> | PinoObject,
  serverFactory?: FastifyServerFactory<RawServer>,
  caseSensitive?: boolean,
  requestIdHeader?: string,
  genReqId?: (req: FastifyRequest<RawServer, RawRequestDefault<RawServer>>) => string,
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
export { FastifyPlugin } from './types/plugin'
export { FastifyInstance } from './types/instance'
export { FastifyLoggerOptions, FastifyLoggerWriteFn } from './types/logger'
export { FastifyMiddleware, FastifyMiddlewareWithPayload } from './types/middleware'
export { FastifyContext } from './types/context'
export { RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export { RegisterOptions } from './types/register'
export { FastifyBodyParser, FastifyContentTypeParser, addContentTypeParser, hasContentTypeParser } from './types/content-type-parser'
export { FastifyError, ValidationResult } from './types/error'
export { FastifySchema, FastifySchemaCompiler } from './types/schema'
export { HTTPMethods, RawServerBase, RawRequestBase, RawReplyBase, RawServerDefault, RawRequestDefault, RawReplyDefault } from './types/utils'
export { onCloseHook, onRouteHook, onRequestHook, onSendHook, onErrorHook, preHandlerHook, preParsingHook, preSerializationHook, preValidationHook } from './types/hooks'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/serverFactory'
export { fastify }
