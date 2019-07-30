/* eslint no-unused-vars: 0 */
/* eslint no-undef: 0 */
/* eslint space-infix-ops: 0 */

/// <reference types="node" />

import * as http from 'http'
import * as http2 from 'http2'
import * as https from 'https'

declare function fastify<
  HttpServer extends (http.Server | http2.Http2Server) = http.Server,
  HttpRequest extends (http.IncomingMessage | http2.Http2ServerRequest) = http.IncomingMessage,
  HttpResponse extends (http.ServerResponse | http2.Http2ServerResponse) = http.ServerResponse
>(opts?: fastify.ServerOptions): fastify.FastifyInstance<HttpServer, HttpRequest, HttpResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp): fastify.FastifyInstance<http.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp): fastify.FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsHttp2): fastify.FastifyInstance<http2.Http2Server, http2.Http2ServerRequest, http2.Http2ServerResponse>;
declare function fastify(opts?: fastify.ServerOptionsAsSecureHttp2): fastify.FastifyInstance<http2.Http2SecureServer, http2.Http2ServerRequest, http2.Http2ServerResponse>;

// eslint-disable-next-line no-redeclare
declare namespace fastify {

  type Plugin < HttpServer, HttpRequest, HttpResponse, T > = (instance: FastifyInstance< HttpServer, HttpRequest, HttpResponse >, opts: T, callback: (err?: FastifyError) => void) => void

  type Middleware < HttpServer, HttpRequest, HttpResponse > = (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: HttpRequest, res: HttpResponse, callback: (err?: FastifyError) => void) => void

  type DefaultQuery = { [k: string]: any }
  type DefaultParams = { [k: string]: any }
  type DefaultHeaders = { [k: string]: any }
  type DefaultBody = any

  type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS'

  interface ValidationResult {
    keyword: string;
    dataPath: string;
    schemaPath: string;
    params: {
      [type: string]: string;
    },
    message: string;
  }

  /**
   * Fastify custom error
   */
  interface FastifyError extends Error {
    statusCode?: number;
    /**
     * Validation errors
     */
    validation?: Array<ValidationResult>;
  }

  interface Logger {
    fatal(msg: string, ...args: any[]): void;
    fatal(obj: {}, msg?: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
    error(obj: {}, msg?: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    warn(obj: {}, msg?: string, ...args: any[]): void;
    info(msg: string, ...args: any[]): void;
    info(obj: {}, msg?: string, ...args: any[]): void;
    debug(msg: string, ...args: any[]): void;
    debug(obj: {}, msg?: string, ...args: any[]): void;
    trace(msg: string, ...args: any[]): void;
    trace(obj: {}, msg?: string, ...args: any[]): void;
  }

  type FastifyMiddleware<
  HttpServer = http.Server,
  HttpRequest = http.IncomingMessage,
  HttpResponse = http.ServerResponse,
  Query = DefaultQuery,
  Params = DefaultParams,
  Headers = DefaultHeaders,
  Body = DefaultBody
  > = (
    this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>,
    req: FastifyRequest<HttpRequest, Query, Params, Headers, Body>,
    reply: FastifyReply<HttpResponse>,
    done: (err?: Error) => void,
  ) => void

  type FastifyMiddlewareWithPayload<
  HttpServer = http.Server,
  HttpRequest = http.IncomingMessage,
  HttpResponse = http.ServerResponse,
  Query = DefaultQuery,
  Params = DefaultParams,
  Headers = DefaultHeaders,
  Body = DefaultBody
  > = (
    this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>,
    req: FastifyRequest<HttpRequest, Query, Params, Headers, Body>,
    reply: FastifyReply<HttpResponse>,
    payload: any,
    done: (err?: Error, value?: any) => void,
  ) => void

  type RequestHandler<
  HttpRequest = http.IncomingMessage,
  HttpResponse = http.ServerResponse,
  Query = DefaultQuery,
  Params = DefaultParams,
  Headers = DefaultHeaders,
  Body = DefaultBody
  > = (
    this: FastifyInstance<http.Server, HttpRequest, HttpResponse>,
    request: FastifyRequest<HttpRequest, Query, Params, Headers, Body>,
    reply: FastifyReply<HttpResponse>,
  ) => void | Promise<any>

  type SchemaCompiler = (schema: Object) => Function

  type BodyParser<HttpRequest, RawBody extends string | Buffer> =
    | ((req: HttpRequest, rawBody: RawBody, done: (err: Error | null, body?: any) => void) => void)
    | ((req: HttpRequest, rawBody: RawBody) => Promise<any>)

  type ContentTypeParser<HttpRequest> =
    | ((req: HttpRequest, done: (err: Error | null, body?: any) => void) => void)
    | ((req: HttpRequest) => Promise<any>)

  interface FastifyContext {
    config: any
  }

  /**
   * fastify's wrapped version of node.js IncomingMessage
   */
  interface FastifyRequest<
    HttpRequest = http.IncomingMessage,
    Query = DefaultQuery,
    Params = DefaultParams,
    Headers = DefaultHeaders,
    Body = DefaultBody
  > {
    query: Query

    params: Params

    headers: Headers

    body: Body

    id: any

    ip: string
    ips: string[]
    hostname: string

    raw: HttpRequest
    req: HttpRequest
    log: Logger
  }

  /**
   * Response object that is used to build and send a http response
   */
  interface FastifyReply<HttpResponse> {
    code(statusCode: number): FastifyReply<HttpResponse>
    status(statusCode: number): FastifyReply<HttpResponse>
    header(name: string, value: any): FastifyReply<HttpResponse>
    headers(headers: { [key: string]: any }): FastifyReply<HttpResponse>
    getHeader(name: string): string | undefined
    hasHeader(name: string): boolean
    callNotFound(): void
    getResponseTime(): number
    type(contentType: string): FastifyReply<HttpResponse>
    redirect(url: string): FastifyReply<HttpResponse>
    redirect(statusCode: number, url: string): FastifyReply<HttpResponse>
    serialize(payload: any): string
    serializer(fn: Function): FastifyReply<HttpResponse>
    send(payload?: any): FastifyReply<HttpResponse>
    sent: boolean
    res: HttpResponse
    context: FastifyContext
  }
  type TrustProxyFunction = (addr: string, index: number) => boolean
  interface ServerOptions {
    caseSensitive?: boolean,
    ignoreTrailingSlash?: boolean,
    bodyLimit?: number,
    pluginTimeout?: number,
    disableRequestLogging?: boolean,
    onProtoPoisoning?: 'error' | 'remove' | 'ignore',
    logger?: any,
    trustProxy?: string | number | boolean | Array<string> | TrustProxyFunction,
    maxParamLength?: number,
    querystringParser?: (str: string) => { [key: string]: string | string[] },
    versioning? : {
      storage() : {
        get(version: String) : Function | null,
        set(version: String, store: Function) : void,
        del(version: String) : void,
        empty() : void
      },
      deriveVersion<Context>(req: Object, ctx?: Context) : String,
    },
    modifyCoreObjects?: boolean,
    return503OnClosing?: boolean
  }
  interface ServerOptionsAsSecure extends ServerOptions {
    https: http2.SecureServerOptions
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
    headers?: JSONSchema
    response?: {
      [code: number]: JSONSchema,
      [code: string]: JSONSchema
    }
  }

  /**
   * Optional configuration parameters for the route being created
   */
  interface RouteShorthandOptions<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse,
    Query = DefaultQuery,
    Params = DefaultParams,
    Headers = DefaultHeaders,
    Body = DefaultBody
  > {
    schema?: RouteSchema
    attachValidation?: boolean
    onRequest?:
      | FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>
      | Array<FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>>
    preParsing?:
      | FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>
      | Array<FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>>
    preValidation?:
      | FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>
      | Array<FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>>
    preHandler?:
      | FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>
      | Array<FastifyMiddleware<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>>
    preSerialization?:
      FastifyMiddlewareWithPayload<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>
      | Array<FastifyMiddlewareWithPayload<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>>
    schemaCompiler?: SchemaCompiler
    bodyLimit?: number
    logLevel?: string
    config?: any
    prefixTrailingSlash?: 'slash' | 'no-slash' | 'both'
  }

  /**
   * Route configuration options such as "url" and "method"
   */
  interface RouteOptions<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse,
    Query = DefaultQuery,
    Params = DefaultParams,
    Headers = DefaultHeaders,
    Body = DefaultBody
  > extends RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body> {
    method: HTTPMethod | HTTPMethod[]
    url: string
    handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>
  }

  /**
   * Register options
   */
  interface RegisterOptions<HttpServer, HttpRequest, HttpResponse> {
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
    headers?: DefaultHeaders,
    query?: DefaultQuery,
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
    headers: Record<string, string>,
    statusCode: number,
    statusMessage: string,
    payload: string,
    rawPayload: Buffer,
    trailers: object
  }

  /**
   * Server listen options
   */
  interface ListenOptions {
    port?: number;
    host?: string;
    backlog?: number;
    path?: string;
    exclusive?: boolean;
    readableAll?: boolean;
    writableAll?: boolean;
    /**
     * @default false
     */
    ipv6Only?: boolean;
  }

  /**
   * Represents the fastify instance created by the factory function the module exports.
   */
  interface FastifyInstance<HttpServer = http.Server, HttpRequest = http.IncomingMessage, HttpResponse = http.ServerResponse> {
    server: HttpServer
    log: Logger
    schemaCompiler: SchemaCompiler

    /**
     * Adds a route to the server
     */
    route<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      opts: RouteOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path, options, and handler
     */
    get<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a GET route with the given mount path and handler
     */
    get<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path, options, and handler
     */
    put<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PUT route with the given mount path and handler
     */
    put<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path, options, and handler
     */
    patch<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a PATCH route with the given mount path and handler
     */
    patch<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path, options, and handler
     */
    post<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a POST route with the given mount path and handler
     */
    post<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path, options, and handler
     */
    head<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a HEAD route with the given mount path and handler
     */
    head<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path, options, and handler
     */
    delete<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a DELETE route with the given mount path and handler
     */
    delete<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path, options, and handler
     */
    options<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a OPTIONS route with the given mount path and handler
     */
    options<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a route for all the supported methods with the given mount path, options, and handler
     */
    all<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      opts: RouteShorthandOptions<HttpServer, HttpRequest, HttpResponse, Query, Params, Headers, Body>,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Defines a route for all the supported methods with the given mount path and handler
     */
    all<Query = DefaultQuery, Params = DefaultParams, Headers = DefaultHeaders, Body = DefaultBody>(
      url: string,
      handler: RequestHandler<HttpRequest, HttpResponse, Query, Params, Headers, Body>,
    ): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Starts the server on the given port after all the plugins are loaded,
     * internally waits for the .ready() event. The callback is the same as the
     * Node core.
     */
    listen(callback: (err: Error, address: string) => void): void
    listen(port: number, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, callback: (err: Error, address: string) => void): void
    listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void
    listen(options: ListenOptions, callback: (err: Error, address: string) => void): void
    listen(sockFile: string, callback: (err: Error, address: string) => void): void
    listen(port: number, address?: string, backlog?: number): Promise<string>
    listen(sockFile: string): Promise<string>
    listen(options: ListenOptions): Promise<string>

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
    close<T = any>(): Promise<T>

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
    addHook(name: 'onRequest', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Add a hook that is triggered after the onRequest hook and middlewares, but before body parsing
     */
    addHook(name: 'preParsing', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Add a hook that is triggered after the onRequest, middlewares, and body parsing, but before the validation
     */
    addHook(name: 'preValidation', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired after a request is processed, but before the response is serialized
     * hook
     */
    addHook(name: 'preSerialization', hook: FastifyMiddlewareWithPayload<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired before a request is processed, but after the "preValidation"
     * hook
     */
    addHook(name: 'preHandler', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired after a request is processed, but before the "onResponse"
     * hook
     */
    addHook(name: 'onSend', hook: (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>, payload: any, done: (err?: Error, value?: any) => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

    /**
     * Hook that is fired if `reply.send` is invoked with an Error
     */
    addHook(name: 'onError', hook: (this: FastifyInstance<HttpServer, HttpRequest, HttpResponse>, req: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>, error: FastifyError, done: () => void) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

     /**
     * Hook that is called when a response is about to be sent to a client
     */
    addHook(name: 'onResponse', hook: FastifyMiddleware<HttpServer, HttpRequest, HttpResponse>): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

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
     * Adds a hook that is triggered when Fastify a new plugin is being registered.
     * This hook can be useful if you are developing a plugin that needs to use the encapsulation functionality of Fastify.
     * The interface is synchronous, and, as such, the listeners do not get passed a callback.
     */
    addHook(name: 'onRegister', hook: (instance: FastifyInstance) => void): FastifyInstance<HttpServer, HttpRequest, HttpResponse>

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
    setErrorHandler(handler: (error: FastifyError, request: FastifyRequest<HttpRequest>, reply: FastifyReply<HttpResponse>) => void): void

    /**
     * Set a function that will be called whenever an error happens
     */
    setReplySerializer(handler: (payload: string | object | Buffer | NodeJS.ReadableStream, statusCode: number) => string): void

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
    addContentTypeParser(contentType: string | string[], opts: { bodyLimit?: number }, parser: ContentTypeParser<HttpRequest>): void
    addContentTypeParser(contentType: string | string[], opts: { parseAs: 'string'; bodyLimit?: number }, parser: BodyParser<HttpRequest, string>): void
    addContentTypeParser(contentType: string | string[], opts: { parseAs: 'buffer'; bodyLimit?: number }, parser: BodyParser<HttpRequest, Buffer>): void
    addContentTypeParser(contentType: string | string[], parser: ContentTypeParser<HttpRequest>): void

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
