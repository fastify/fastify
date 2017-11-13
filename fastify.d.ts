
/// <reference types="node" />
/// <reference types="pino" />

import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import * as pino from 'pino';

declare function fastify<HttpServer, HttpRequest, HttpResponse>(opts?: fastify.ServerOptions): fastify.FastifyInstance<HttpServer, HttpRequest, HttpResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp): fastify.FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp): fastify.FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp2): fastify.FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp2): fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;

declare namespace fastify {

  type Plugin<HttpServer, HttpRequest, HttpResponse, T> = (instance: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, opts: T, callback?: (err?: Error) => void) => void

  type Middleware<HttpRequest, HttpResponse> = (req: HttpRequest, res: HttpResponse, callback?: (err?: Error) => void) => void

  type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS';

  type FastifyMiddleware<HttpRequest, HttpResponse> = (req: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>, done: (err?: Error) => void) => void

  type RequestHandler<HttpRequest, HttpResponse> = (req: FastifyRequest<HttpRequest>, res: FastifyReply<HttpResponse>) => void

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

    body: any,

    req: HttpRequest,
    log: pino.Logger
  }

  /**
   * Response object that is used to build and send a http response
   */
  interface FastifyReply<HttpResponse> {
    code: (statusCode: number) => FastifyReply<HttpResponse>
    header: (name: string, value: any) => FastifyReply<HttpResponse>
    type: (contentType: string) => FastifyReply<HttpResponse>
    redirect: (statusCode: number, url: string) => FastifyReply<HttpResponse>
    serialize: (payload: any) => string
    serializer: (fn: Function) => FastifyReply<HttpResponse>
    send: (payload?: string|Array<any>|Object|Error|Promise<any>|NodeJS.ReadableStream) => FastifyReply<HttpResponse>
    sent: boolean
    res: HttpResponse
  }

  interface ServerOptions {
    logger?: pino.LoggerOptions,
  }
  interface ServerOptionsAsSecure extends ServerOptions {
    https: {
      key: Buffer,
      cert: Buffer
    }
  }
  interface ServerOptionsAsHttp extends ServerOptions {
    http2?: false
  }
  interface ServerOptionsAsSecureHttp extends ServerOptionsAsHttp, ServerOptionsAsSecure {}
  interface ServerOptionsAsHttp2 extends ServerOptions {
    http2: true
  }
  interface ServerOptionsAsSecureHttp2 extends ServerOptionsAsHttp2, ServerOptionsAsSecure {}

  interface JSONSchema {
    // TODO - define/import JSONSchema types
    body?: Object
    querystring?: Object
    params?: Object
    response?: {
      [code: number]: Object,
      [code: string]: Object
    }
  }

  /**
   * Optional configuration parameters for the route being created
   */
  interface RouteShorthandOptions<HttpRequest, HttpResponse> {
    schema?: JSONSchema
    beforeHandler?: FastifyMiddleware<HttpRequest, HttpResponse>
  }

  /**
   * Route configuration options such as "url" and "method"
   */
  interface RouteOptions<HttpRequest, HttpResponse> extends RouteShorthandOptions<HttpRequest, HttpResponse> {
    method: HTTPMethod|HTTPMethod[],
    url: string,
    handler: RequestHandler<HttpRequest, HttpResponse>
  }

  /**
   * Register options
   */
  interface RegisterOptions<HttpRequest, HttpResponse> extends RouteShorthandOptions<HttpRequest, HttpResponse> {
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
  interface FastifyInstance<HttpServer, HttpRequest, HttpResponse> {
    server: HttpServer
    log: pino.Logger

    /**
     * Adds a route to the server
     */
    route(opts: RouteOptions<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path, options, and handler
     */
    get(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path and handler
     */
    get(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path, options, and handler
     */
    put(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path and handler
     */
    put(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path, options, and handler
     */
    patch(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path and handler
     */
    patch(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path, options, and handler
     */
    post(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path and handler
     */
    post(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path, options, and handler
     */
    head(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path and handler
     */
    head(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path, options, and handler
     */
    delete(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path and handler
     */
    delete(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path, options, and handler
     */
    options(url: string, opts: RouteShorthandOptions<HttpRequest, HttpResponse>, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path and handler
     */
    options(url: string, handler: RequestHandler<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Starts the server on the given port after all the plugins are loaded,
     * internally waits for the .ready() event. The callback is the same as the
     * Node core.
     */
    listen(port: number, hostname: string, callback?: (err: Error) => void): http.Server

    /**
     * Starts the server on the given port after all the plugins are loaded,
     * internally waits for the .ready() event. The callback is the same as the
     * Node core.
     */
    listen(port: number, callback?: (err: Error) => void): http.Server
    listen(path: string, callback?: (err: Error) => void): http.Server

    /**
     * Registers a listener function that is invoked when all the plugins have
     * been loaded. It receives an error parameter if something went wrong.
     */
    ready(readyListener?: () => void): void

    /**
     * Call this function to close the server instance and run the "onClose" callback
     */
    close(closeListener: () => void): void

    /**
     * Apply the given middleware to all incoming requests
     */
    use(middleware: Middleware<HttpRequest, HttpResponse>): void

    /**
     * Apply the given middleware to routes matching the given path
     */
    use(path: string, middleware: Middleware<HttpRequest, HttpResponse>): void

    /**
     * Registers a plugin or array of plugins on the server
     */
    register<T extends RegisterOptions<HttpRequest, HttpResponse>>(plugin: Plugin<HttpServer, HttpRequest, HttpResponse, T>|Array<Plugin<HttpServer, HttpRequest, HttpResponse, T>>, opts?: T, callback?: (err: Error) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

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
     * Add a hook that is triggered when a request is initially received
     */
    addHook(name: 'onRequest', hook: Middleware<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired before a request is processed, but after the "onRequest"
     * hook
     */
    addHook(name: 'preHandler', hook: FastifyMiddleware<HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is called when a response is about to be sent to a client
     */
    addHook(name: 'onResponse', hook: (res: http.OutgoingMessage, next: (err?: Error) => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Adds a hook that is triggered when server.close is called. Useful for closing connections
     * and performing cleanup tasks
     */
    addHook(name: 'onClose', hook: (instance: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, done: () => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Useful for testing http requests without running a sever
     */
    inject(opts: HTTPInjectOptions, clb: (res: HTTPInjectResponse) => void): void

    /**
     * Useful for testing http requests without running a sever
     */
    inject(opts: HTTPInjectOptions): Promise<HTTPInjectResponse>

    /**
     * Set the 404 handler
     */
    setNotFoundHandler(handler: (request: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>) => void): void

    /**
     * Set a function that will be called whenever an error happens
     */
    setErrorHandler(handler: (error: Error, reply: FastifyReply<HttpResponse>) => void): void
  }
}

export = fastify;
