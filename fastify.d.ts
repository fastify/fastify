import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyRequest } from './types/request'
import { FastifyReply } from './types/reply'
import {
  RouteOptions,
  RouteShorthandIntersection
} from './types/route'
import { FastifySchema } from './types/schema'
import {
  HTTPMethods,
  RawServerBase,
  RawRequestBase,
  RawReplyBase,
  RawServerDefault,
  RawRequestDefault,
  RawReplyDefault
} from './types/utils'
import { FastifyLogger } from './types/logger'
import { InjectOptions, InjectPayload } from 'light-my-request'
import { FastifyRegister } from './types/register';
import { FastifyInstance } from './types/instance'

/**
 * Fastify factor function for the standard fastify http, https, or http2 server instance.
 *
 * The default function utilizes http
 *
 * @param opts Fastify server options
 */
export default function fastify<
  RawServer extends RawServerBase = RawServerDefault
>(opts?: FastifyServerOptions<RawServer>): FastifyInstance<RawServer>; // For `import fastify from 'fastify'`

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
  logger?: FastifyLogger,
  serverFactory?: any, // inquire with team / code base for more details
  caseSensitive?: boolean,
  requestIdHeader?: string,
  genReqId?: (req: FastifyRequest<RawRequestDefault<RawServer>>) => string,
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

interface FastifyContext {

} // todo

/* Export all additional types*/
export { FastifyPlugin } from './types/plugin'
export { FastifyInstance } from './types/instance'
export { fastify } // For `import { fastify } from 'fastify'`
