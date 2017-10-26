
/// <reference types="node" />
/// <reference types="pino" />

import * as http from 'http';
import * as pino from 'pino';

declare function fastify(opts?: fastify.ServerOptions): fastify.FastifyInstance;

declare namespace fastify {

  type Plugin<T> = (instance: FastifyInstance, opts: T, callback?: (err?: Error) => void) => void

  type Middleware = (req: http.IncomingMessage, res: http.OutgoingMessage, callback?: (err?: Error) => void) => void

  type HTTPMethod = 'DELETE' | 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'OPTIONS';

  type FastifyMiddleware = (req: FastifyRequest, reply: FastifyReply, done: (err?: Error) => void) => void

  type RequestHandler = (req: FastifyRequest, res: FastifyReply) => void

  /**
   * fastify's wrapped version of node.js IncomingMessage
   */
  interface FastifyRequest {
    query: {
      [key: string]: any
    },

    params: {
      [key: string]: any
    },

    body: any,

    req: http.IncomingMessage
    log: pino.Logger
  }

  /**
   * Response object that is used to build and send a http response
   */
  interface FastifyReply {
    code: (statusCode: number) => FastifyReply
    header: (name: string, value: any) => FastifyReply
    type: (contentType: string) => FastifyReply
    redirect: (statusCode: number, url: string) => FastifyReply
    serializer: (fn: Function) => FastifyReply
    send: (payload?: string|Array<any>|Object|Error|Promise<any>|NodeJS.ReadableStream) => FastifyReply
    sent: boolean
  }

  interface ServerOptions {
    logger?: pino.LoggerOptions,
    https?: {
      key: Buffer,
      cert: Buffer
    }
  }

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
  interface RouteShorthandOptions {
    schema?: JSONSchema
    beforeHandler?: FastifyMiddleware
  }

  /**
   * Route configuration options such as "url" and "method"
   */
  interface RouteOptions extends RouteShorthandOptions {
    method: HTTPMethod|HTTPMethod[],
    url: string,
    handler: RequestHandler
  }

  /**
   * Register options
   */
  interface RegisterOptions extends RouteShorthandOptions {
    [key: string]: any,
    prefix?: string,
  }

  /**
   * Represents the fastify instance created by the factory function the module exports.
   */
  interface FastifyInstance {
    server: http.Server

    /**
     * Adds a route to the server
     */
    route(opts: RouteOptions): FastifyInstance

    /**
     * Defines a GET route with the given mount path, options, and handler
     */
    get(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a GET route with the given mount path and handler
     */
    get(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a PUT route with the given mount path, options, and handler
     */
    put(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a PUT route with the given mount path and handler
     */
    put(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a PATCH route with the given mount path, options, and handler
     */
    patch(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a PATCH route with the given mount path and handler
     */
    patch(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a POST route with the given mount path, options, and handler
     */
    post(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a POST route with the given mount path and handler
     */
    post(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a HEAD route with the given mount path, options, and handler
     */
    head(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a HEAD route with the given mount path and handler
     */
    head(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a DELETE route with the given mount path, options, and handler
     */
    delete(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a DELETE route with the given mount path and handler
     */
    delete(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Defines a OPTIONS route with the given mount path, options, and handler
     */
    options(url: string, opts: RouteShorthandOptions, handler: RequestHandler): FastifyInstance

    /**
     * Defines a OPTIONS route with the given mount path and handler
     */
    options(url: string, handler: RequestHandler): FastifyInstance

    /**
     * Starts the server on the given port after all the plugins are loaded,
     * internally waits for the .ready() event. The callback is the same as the
     * Node core.
     */
    listen(port: number, hostname: string, backlog: number, callback?: (err: Error) => void): http.Server

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
    use(middleware: Middleware): void

    /**
     * Apply the given middleware to routes matching the given path
     */
    use(path: string, middleware: Middleware): void

    /**
     * Registers a plugin or array of plugins on the server
     */
    register<T extends RegisterOptions>(plugin: Plugin<T>|Array<Plugin<T>>, opts?: T, callback?: (err: Error) => void): FastifyInstance

    /**
     * Decorate this fastify instance with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorate(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance

    /**
     * Decorate reply objects with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorateReply(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance

    /**
     * Decorate request objects with new properties. Throws an execption if
     * you attempt to add the same decorator name twice
     */
    decorateRequest(name: string, decoration: any, dependencies?: Array<string>): FastifyInstance

    /**
     * Extends the standard server error. Return an object with the properties you'd
     * like added to the error
     */
    extendServerError(extendFn: () => Object): FastifyInstance

    /**
     * Determines if the given named decorator is available
     */
    hasDecorator(name: string): boolean

    /**
     * Add a hook that is triggered when a request is initially received
     */
    addHook(name: 'onRequest', hook: Middleware): FastifyInstance

    /**
     * Hook that is fired before a request is processed, but after the "onRequest"
     * hook
     */
    addHook(name: 'preHandler', hook: FastifyMiddleware): FastifyInstance

    /**
     * Hook that is called when a response is about to be sent to a client
     */
    addHook(name: 'onResponse', hook: (res: http.OutgoingMessage, next: (err?: Error) => void) => void): FastifyInstance

    /**
     * Adds a hook that is triggered when server.close is called. Useful for closing connections
     * and performing cleanup tasks
     */
    addHook(name: 'onClose', hook: (instance: FastifyInstance, done: () => void) => void): FastifyInstance

    /**
     * Set the 404 handler
     */
    setNotFoundHandler(handler: (request: FastifyRequest, reply: FastifyReply) => void): void

    /**
     * Set a function that will be called whenever an error happens
     */
    setErrorHandler(handler: (error: Error, reply: FastifyReply) => void): void
  }
}

export = fastify;
