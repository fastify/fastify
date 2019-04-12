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

/**
 * Fastify factor function for the standard fastify http, https, or http2 server instance.
 *
 * The default function utilizes http
 *
 * @param opts Fastify server options
 */
export default function fastify<
  RawServer extends RawServerBase = RawServerDefault
>(opts?: ServerOptions<RawServer>): FastifyInstance<RawServer>;

/**
 * FastifyInstance interface for the standard fastify instance object returned by the fastify factory function.
 * 
 * The default interface instance implements an http server. It is recommended you only define the RawServer generic and let TypeScript determine the generic value of RawRequest and RawReply.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault, 
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>, 
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  server: RawServer
  prefix: string
  log: FastifyLogger

  addSchema(schema: FastifySchema): FastifyInstance<RawServer, RawRequest, RawReply>

  after(err: Error): FastifyInstance<RawServer, RawRequest, RawReply>

  close(closeListener?: () => void): void
  close<T>(): Promise<T> // what is this use case? Not documented on Server#close

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enfore the users function returns what they expect it to
  decorate(property: string, value: any, dependencies?: Array<string>): FastifyInstance<RawServer, RawRequest, RawReply>
  decorateRequest(property: string, value: any, dependencies?: Array<string>): FastifyInstance<RawServer, RawRequest, RawReply>
  decorateReply(property: string, value: any, dependencies?: Array<string>): FastifyInstance<RawServer, RawRequest, RawReply>

  hasDecorator(decorator: string): boolean
  hasRequestDecorator(decorator: string): boolean
  hasReplyDecorator(decorator: string): boolean

  inject(opts: InjectOptions | string, cb: (err: Error, response: InjectPayload) => void): void
  inject(opts: InjectOptions | string): Promise<InjectPayload>

  listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void
  listen(port: number, address: string, callback: (err: Error, address: string) => void): void
  listen(port: number, callback: (err: Error, address: string) => void): void
  listen(port: number, address?: string, backlog?: number): Promise<string>

  ready(): Promise<FastifyInstance<RawServer, RawRequest, RawReply>>
  ready(readyListener: (err: Error) => void): void

  register: FastifyRegister<RawServer, RawRequest, RawReply>
  use: FastifyRegister<RawServer, RawRequest, RawReply>

  route(opts?: RouteOptions<RawServer, RawRequest, RawReply>): FastifyInstance<RawServer, RawRequest, RawReply>

  // Would love to implement something like the following:
  // [key in RouteMethodsLower]: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>,

  get: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  head: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  post: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  put: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  delete: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  options: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  patch: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
  all: RouteShorthandIntersection<RawServer, RawRequest, RawReply>
}

export type ServerOptions<
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

