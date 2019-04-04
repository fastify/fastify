import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

import { FastifyRequest } from './types/request'
import { FastifyReply } from './types/reply'
import {
  RouteHandlerMethod,
  RouteOptions,
  RouteShorthandMethod,
  RouteShorthandMethodWithOptions,
  RouteShorthandOptions
} from './types/route'
import { FastifySchema } from './types/schema'
import { HTTPMethods } from './types/utils'
import { FastifyLogger } from './types/logger'
/**
 * Fastify factor function for the standard fastify http, https, or http2 server instance.
 *
 * The default function utilizes http
 *
 * @param opts Fastify server options
 */
declare function fastify<
  RawServer extends http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer = http.Server
>(opts?: fastify.ServerOptions<RawServer>): fastify.FastifyInstance<RawServer>;

declare namespace fastify {
  /**
   * FastifyInstance interface for the standard fastify instance object returned by the fastify factory function.
   * 
   * The default interface instance implements an http server. It is recommended you only define the RawServer generic and let TypeScript determine the generic value of RawRequest and RawReply.
   */
  interface FastifyInstance<
    RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server, 
    RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest, 
    RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse
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

    inject(opts: FastifyInjectOptions | string, cb: (err: Error, response: FastifyInjectResponse) => void): void
    inject(opts: FastifyInjectOptions | string): Promise<FastifyInjectResponse>

    listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, callback: (err: Error, address: string) => void): void
    listen(port: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address?: string, backlog?: number): Promise<string>
  
    ready(): Promise<FastifyInstance<RawServer, RawRequest, RawReply>>
    ready(readyListener: (err: Error) => void): void

    register(): void // this should be a fun one 

    use(): void // same here

    route(opts?: RouteOptions<RawServer, RawRequest, RawReply>): FastifyInstance<RawServer, RawRequest, RawReply>

    // Would love to implement something like the following:
    // [key in RouteMethodsLower]: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>,

    get: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    head: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    post: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    put: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    delete: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    options: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    patch: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
    all: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>
  }

  type FastifyInjectResponse = {
    raw: {
      req: NodeJS.ReadableStream,
      res: http.ServerResponse
    },
    headers: object,
    statusCode: number,
    statusMessage: string,
    payload: string,
    rawPayload: Buffer,
    trailers: object
  }

  type FastifyInjectOptions = {
    url: string,
    method?: HTTPMethods,
    authority?: string,
    headers?: any,
    query?: any,
    remoteAddress?: string,
    payload?: string | object | Buffer | NodeJS.ReadableStream
    simulate?: {
      end?: boolean,
      split?: boolean,
      error?: boolean,
      close?: boolean
    },
    validate?: boolean
  }

  type ServerOptions<
    RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server,
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
    genReqId?: (req: FastifyRequest<RawServer extends (http.Server | https.Server) ? http.IncomingMessage : http2.Http2ServerRequest>) => string,
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
}

export = fastify