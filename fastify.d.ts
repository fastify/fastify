/* eslint no-unused-vars: 0 */
/* eslint no-undef: 0 */
/* eslint space-infix-ops: 0 */

/// <reference types="node" />
/// <reference types="pino" />

import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'
import * as tls from 'tls'
import * as pino from 'pino'

declare function fastify<
  HttpServer extends (http.Server | http2.Http2Server) = http.Server,
  HttpRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = http.IncomingMessage,
  HttpResponse extends (http.ServerResponse | http2.Http2ServerResponse) = http.ServerResponse
>(opts?: fastify.ServerOptions): fastify.FastifyInstance<HttpServer, HttpRequest, HttpResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp): fastify.FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp): fastify.FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp2): fastify.FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp2): fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;

declare namespace fastify {

  type Plugin < HttpServer, HttpRequest, HttpResponse, T > = (instance: FastifyInstance< HttpServer, HttpRequest, HttpResponse >, opts: T, callback: (err?: Error) => void) => void

  type Middleware < HttpServer, HttpRequest, HttpResponse > = (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: HttpRequest, res: HttpResponse, callback: (err?: Error) => void) => void

  type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

  type FastifyMiddleware < HttpServer, HttpRequest, HttpResponse > = (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>, done: (err?: Error) => void) => void

  type RequestHandler < HttpRequest, HttpResponse > = (request: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>) => void | Promise<any>

  type SchemaCompiler = (schema: Object) => Function

  type AsyncContentTypeParser < HttpRequest > = (req: HttpRequest) => Promise<any>
  type ContentTypeParser < HttpRequest > = (req: HttpRequest, done: (err: Error | null, body?: any) => void) => void

  interface FastifyContext {
    config: any
  }

  /**
   * fastify's wrapped version of node.js IncomingMessage
   */
  interface FastifyRequest<HttpRequest> {
    query: {
      [key: string]: any
    },

    params: {
      [key: string]: any
    },

    headers: {
      [key: string]: any
    },

    body: any,

    id: any,

    ip: string,
    hostname: string,

    raw: HttpRequest,
    req: HttpRequest,
    log: pino.Logger
  }

  /**
   * Response object that is used to build and send a http response
   */
  interface FastifyReply<HttpResponse> {
    code: (statusCode: number) => FastifyReply<HttpResponse>
    status: (statusCode: number) => FastifyReply<HttpResponse>
    header: (name: string, value: any) => FastifyReply<HttpResponse>
    headers: (headers: { [key: string]: any }) => FastifyReply<HttpResponse>
    type: (contentType: string) => FastifyReply<HttpResponse>
    redirect: (statusCode: number, url: string) => FastifyReply<HttpResponse>
    serialize: (payload: any) => string
    serializer: (fn: Function) => FastifyReply<HttpResponse>
    send: (payload?: any) => FastifyReply<HttpResponse>
    sent: boolean
    res: HttpResponse
    context: FastifyContext
  }
  type TrustProxyFunction = (addr: string, index: number) => boolean
  interface ServerOptions {
    ignoreTrailingSlash?: boolean,
    bodyLimit?: number,
    logger?: pino.LoggerOptions | boolean,
    trustProxy?: string | number | boolean | Array<string> | TrustProxyFunction,
    maxParamLength?: number,
  }
  interface ServerOptionsAsSecure extends ServerOptions {
    https: tls.TlsOptions
  }
  interface ServerOptionsAsHttp extends ServerOptions {
    http2?: false
  }
  interface ServerOptionsAsSecureHttp extends ServerOptionsAsHttp, ServerOptionsAsSecure {}
  interface ServerOptionsAsHttp2 extends ServerOptions {
    http2: true
  }
  interface ServerOptionsAsSecureHttp2 extends ServerOptionsAsHttp2, ServerOptionsAsSecure {}

  // TODO - define/import JSONSchema types
  type JSONSchema = Object

  interface RouteSchema {
    body?: JSONSchema
    querystring?: JSONSchema
    params?: JSONSchema
    response?: {
      [code: number]: JSONSchema,
      [code: string]: JSONSchema
    }
  }

  /**
   * Optional configuration parameters for the route being created
   */
  interface RouteShorthandOptions<HttpServer = http.Server, HttpRequest = http.IncomingMessage, HttpResponse = http.ServerResponse> {
    schema?: RouteSchema
    beforeHandler?: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse> | Array<FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>>
    schemaCompiler?: SchemaCompiler
    bodyLimit?: number,
    logLevel?: string,
    config?: any
  }

  /**
   * Route configuration options such as "url" and "method"
   */
  interface RouteOptions<HttpServer, HttpRequest, HttpResponse> extends RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse> {
    method: HTTPMethod|HTTPMethod[],
    url: string,
    handler: RequestHandler<HttpRequest, HttpResponse>
  }

  /**
   * Register options
   */
  interface RegisterOptions<HttpServer, HttpRequest, HttpResponse> extends RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse> {
    [key: string]: any,
    prefix?: string,
  }

  /**
   * Fake http inject options
   */
  interface HTTPInjectOptions {
    url: string,
    method?: HTTPMethod,
    authority?: string,
    headers?: object,
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

  /**
   * Fake http inject response
   */
  interface HTTPInjectResponse {
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

  /**
   * Represents the fastify instance created by the factory function the module exports.
   */
  interface FastifyInstance<HttpServer = http.Server, HttpRequest = http.IncomingMessage, HttpResponse = http.ServerResponse> {
    server: HttpServer
    log: pino.Logger

    /**
     * Adds a route to the server
     */
    route(opts: RouteOptions<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path, options, and handler
     */
    get(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path and handler
     */
    get(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path, options, and handler
     */
    put(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path and handler
     */
    put(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path, options, and handler
     */
    patch(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path and handler
     */
    patch(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path, options, and handler
     */
    post(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path and handler
     */
    post(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path, options, and handler
     */
    head(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path and handler
     */
    head(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path, options, and handler
     */
    delete(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path and handler
     */
    delete(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path, options, and handler
     */
    options(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path and handler
     */
    options(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a route for all the supported methods with the given mount path, options, and handler
     */
    all(url: string, opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a route for all the supported methods with the given mount path and handler
     */
    all(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Starts the server on the given port after all the plugins are loaded,
     * internally waits for the .ready() event. The callback is the same as the
     * Node core.
     */
    listen(port: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void
    listen(sockFile: string, callback: (err: Error, address: string) => void): void
    listen(port: number, address?: string, backlog?: number): Promise<string>
    listen(sockFile: string): Promise<string>

    /**
     * Registers a listener function that is invoked when all the plugins have
     * been loaded. It receives an error parameter if something went wrong.
     */
    ready(): Promise<FastifyInstance<HttpServer, HttpRequest, HttpResponse>>
    ready(readyListener: (err: Error) => void): void
    ready(readyListener: (err: Error, done: Function) => void): void
    ready(readyListener: (err: Error, context: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, done: Function) => void): void

    /**
     * Call this function to close the server instance and run the "onClose" callback
     */
    close(closeListener: () => void): void

    /**
     * Apply the given middleware to all incoming requests
     */
    use(middleware: Middleware<HttpServer, HttpRequest, HttpResponse>): void

    /**
     * Apply the given middleware to routes matching the given path
     */
    use(path: string, middleware: Middleware<HttpServer, HttpRequest, HttpResponse>): void

    /**
     * Registers a plugin
     */
    register<T extends RegisterOptions<HttpServer, HttpRequest, HttpResponse>>(plugin: Plugin<HttpServer, HttpRequest, HttpResponse, T>, opts?: T): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * `Register a callback that will be executed just after a register.
     * It can take up to three parameters
     */
    after(afterListener: (err: Error) => void): void
    after(afterListener: (err: Error, done: Function) => void): void
    after(afterListener: (err: Error, context: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, done: Function) => void): void

    /**
     * Decorate this fastify instance with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorate(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Decorate reply objects with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorateReply(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Decorate request objects with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorateRequest(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Extends the standard server error. Return an object with the properties you'd
     * like added to the error
     */
    extendServerError(extendFn: (error: Error) => Object): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Determines if the given named decorator is available
     */
    hasDecorator(name: string): boolean

    /**
     * Determines if the given named request decorator is available
     */
    hasRequestDecorator(name: string): boolean

    /**
     * Determines if the given named reply decorator is available
     */
    hasReplyDecorator(name: string): boolean

    /**
     * Add a hook that is triggered when a request is initially received
     */
    addHook(name: 'onRequest', hook: Middleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired before a request is processed, but after the "onRequest"
     * hook
     */
    addHook(name: 'preHandler', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired after a request is processed, but before the "onResponse"
     * hook
     */
    addHook(name: 'onSend', hook: (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>, payload: any, done: (err?: Error, value?: any) => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

     /**
     * Hook that is called when a response is about to be sent to a client
     */
    addHook(name: 'onResponse', hook: (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, res: http.ServerResponse, next: (err?: Error) => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Adds a hook that is triggered when server.close is called. Useful for closing connections
     * and performing cleanup tasks
     */
    addHook(name: 'onClose', hook: (instance: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, done: () => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Adds a hook that is triggered when a new route is registered. Listeners are passed a
     * routeOptions object as the sole parameter.
     * The interface is synchronous, and, as such, the listeners do not get passed a callback.
     */
    addHook(name: 'onRoute', hook: (opts: RouteOptions<HttpServer, HttpRequest, HttpResponse> & { path: string, prefix: string }) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Useful for testing http requests without running a sever
     */
    inject(opts: HTTPInjectOptions | string, cb: (err: Error, res: HTTPInjectResponse) => void): void

    /**
     * Useful for testing http requests without running a sever
     */
    inject(opts: HTTPInjectOptions | string): Promise<HTTPInjectResponse>

    /**
     * Set the 404 handler
     */
    setNotFoundHandler(handler: (request: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>) => void): void

    /**
     * Set a function that will be called whenever an error happens
     */
    setErrorHandler(handler: (error: Error, request: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>) => void): void

    /**
     * Set the schema compiler for all routes.
     */
    setSchemaCompiler(schemaCompiler: SchemaCompiler): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Create a shared schema
     */
    addSchema(schema: object): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Get all shared schemas
     */
    getSchemas(): {[shemaId: string]: Object}

    /**
     * Add a content type parser
     */
    addContentTypeParser(contentType: string, opts: {parseAs?: string, bodyLimit?: number} | AsyncContentTypeParser<HttpRequest> | ContentTypeParser<HttpRequest>, parser?: AsyncContentTypeParser<HttpRequest> | ContentTypeParser<HttpRequest>): void;

    /**
     * Check if a parser for the specified content type exists
     */
    hasContentTypeParser(contentType: string): boolean;

    /**
     * Prints the representation of the internal radix tree used by the router
     */
    printRoutes(): string
  }
}

export = fastify;
