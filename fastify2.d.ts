import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

declare function fastify<
  RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server,
  RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest,
  RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse,
>(opts?: fastify.ServerOptions<RawServer, RawRequest, RawReply>): fastify.FastifyInstance<RawServer, RawRequest, RawReply>;

declare namespace fastify {
  interface FastifyInstance<
    RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server,
    RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends http.Server | https.Server ? http.IncomingMessage : http2.Http2ServerRequest,
    RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends http.Server | https.Server ? http.ServerResponse : http2.Http2ServerResponse,
  > {
    server: RawServer
    after(err: Error): FastifyInstance<RawServer, RawRequest, RawReply>

    listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, callback: (err: Error, address: string) => void): void    
    listen(port: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address?: string, backlog?: number): Promise<string>

    ready(): Promise<FastifyInstance<RawServer, RawRequest, RawReply>>
    ready(readyListener: (err: Error) => void): void

    route(): void

  }

  /**
   * FastifyRequest is an instance of the standard http or http2 request objects.
   * It defaults to http.IncomingMessage, and it also extends the relative request object.
   */
  type FastifyRequest<RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = http.IncomingMessage> = RawRequest & {
    body: any, // what to do with Body
    id: any, // declare this
    log: FastifyLogger,
    params: any, // declare this
    query: string,
    raw: RawRequest,
  }

  type FastifyReply<RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = http.ServerResponse> = RawReply & {
    callNotFound(): void
    code(statusCode: number): FastifyReply<RawReply>
    hasHeader(key: string): boolean
    header(key: string, value: any): FastifyReply<RawReply>
    getHeader(key: string): string | undefined
    // Note: should consider refactoring the argument order for redirect. statusCode is optional so it should be after the required url param
    redirect(statusCode: number, url: string): FastifyReply<RawReply>
    redirect(url: string): FastifyReply<RawReply>
    removeHeader(key: string): void
    send(payload?: any): FastifyReply<RawReply>
    serialize(payload: any): string
    serializer(fn: (payload: any) => string): FastifyReply<RawReply>
    status(statusCode: number): FastifyReply<RawReply>
    type(contentType: string): FastifyReply<RawReply>
    context: FastifyContext
    res: RawReply,
    sent: boolean
  }

  type ServerOptions<
    RawServer extends (http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer) = http.Server,
    RawRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = RawServer extends (http.Server | https.Server) ? http.IncomingMessage : http2.Http2ServerRequest,
    RawReply extends (http.ServerResponse | http2.Http2ServerResponse) = RawServer extends (http.Server | https.Server) ? http.ServerResponse : http2.Http2ServerResponse,
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
    genReqId?: (req: FastifyRequest<RawRequest>) => string,
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

  interface FastifyLogger {

  }

  interface FastifyContext {

  }
}

export = fastify