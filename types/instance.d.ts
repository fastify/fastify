import { InjectOptions, InjectPayload } from 'light-my-request'
import { RouteOptions, RouteShorthandMethod } from './route'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { RawServerBase, RawRequestDefaultExpression, RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyLoggerOptions } from './logger'
import { FastifyRegister } from './register'
import { AddHook } from './hooks'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifyReply } from './reply'
import { FastifyError } from './error'
import { AddContentTypeParser, hasContentTypeParser } from './content-type-parser'

/**
 * Fastify server instance. Returned by the core `fastify()` method.
 */
export interface FastifyInstance<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger = FastifyLoggerOptions<RawServer>
> {
  server: RawServer;
  prefix: string;
  log: Logger;

  addSchema(schema: FastifySchema): FastifyInstance<RawServer, RawRequest, RawReply>;

  after(err: Error): FastifyInstance<RawServer, RawRequest, RawReply>;

  close(closeListener?: () => void): void;
  close<T>(): Promise<T>; // what is this use case? Not documented on Server#close

  // should be able to define something useful with the decorator getter/setter pattern using Generics to enfore the users function returns what they expect it to
  decorate(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;
  decorateRequest(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;
  decorateReply(property: string | symbol, value: any, dependencies?: string[]): FastifyInstance<RawServer, RawRequest, RawReply>;

  hasDecorator(decorator: string | symbol): boolean;
  hasRequestDecorator(decorator: string | symbol): boolean;
  hasReplyDecorator(decorator: string | symbol): boolean;

  inject(opts: InjectOptions | string, cb: (err: Error, response: InjectPayload) => void): void;
  inject(opts: InjectOptions | string): Promise<InjectPayload>;

  listen(port: number, address: string, backlog: number, callback: (err: Error, address: string) => void): void;
  listen(port: number, address: string, callback: (err: Error, address: string) => void): void;
  listen(port: number, callback: (err: Error, address: string) => void): void;
  listen(port: number, address?: string, backlog?: number): Promise<string>;

  ready(): Promise<FastifyInstance<RawServer, RawRequest, RawReply>>;
  ready(readyListener: (err: Error) => void): void;

  register: FastifyRegister<RawServer, RawRequest, RawReply>;
  use: FastifyRegister<RawServer, RawRequest, RawReply>;

  route<
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault
  >(opts: RouteOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>): FastifyInstance<RawServer, RawRequest, RawReply>;

  // Would love to implement something like the following:
  // [key in RouteMethodsLower]: RouteShorthandMethod<RawServer, RawRequest, RawReply> | RouteShorthandMethodWithOptions<RawServer, RawRequest, RawReply>,

  get: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  head: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  post: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  put: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  delete: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  options: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  patch: RouteShorthandMethod<RawServer, RawRequest, RawReply>;
  all: RouteShorthandMethod<RawServer, RawRequest, RawReply>;

  addHook: AddHook<RawServer, RawRequest, RawReply>;

  /**
   * Set the 404 handler
   */
  setNotFoundHandler(
    handler: (request: FastifyRequest<RawServer, RawRequest>, reply: FastifyReply<RawServer, RawReply>) => void
  ): void;

  /**
   * Set a function that will be called whenever an error happens
   */
  setErrorHandler(
    handler: (error: FastifyError, request: FastifyRequest<RawServer, RawRequest>, reply: FastifyReply<RawServer, RawReply>) => void
  ): void;

  /**
   * Set the schema validator for all routes.
   */
  setValidatorCompiler(schemaCompiler: FastifySchemaCompiler): FastifyInstance<RawServer, RawRequest, RawReply>;
  
  /**
   * Set the schema serializer for all routes.
   */
  setSerializerCompiler(schemaCompiler: FastifySchemaCompiler): FastifyInstance<RawServer, RawRequest, RawReply>;

  /**
   * Add a content type parser
   */
  addContentTypeParser: AddContentTypeParser<RawServer, RawRequest>;
  hasContentTypeParser: hasContentTypeParser;

  /**
   * Prints the representation of the internal radix tree used by the router
   */
  printRoutes(): string;
}
