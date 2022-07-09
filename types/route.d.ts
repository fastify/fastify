import { FastifyInstance } from './instance'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifyReply, ReplyGenericInterface } from './reply'
import { FastifySchema, FastifySchemaCompiler, FastifySchemaValidationError, FastifySerializerCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { preValidationHookHandler, preHandlerHookHandler, preSerializationHookHandler, onRequestHookHandler, preParsingHookHandler, onResponseHookHandler, onSendHookHandler, onErrorHookHandler, onTimeoutHookHandler } from './hooks'
import { FastifyError } from '@fastify/error'
import { FastifyContext } from './context'
import {
  FastifyTypeProvider,
  FastifyTypeProviderDefault,
  ResolveFastifyReplyReturnType
} from './type-provider'
import { FastifyLoggerInstance, LogLevel } from './logger'

export interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface {}

/**
 * Route shorthand options for the various shorthand methods
 */
export interface RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> {
  schema?: SchemaCompiler, // originally FastifySchema
  attachValidation?: boolean;
  exposeHeadRoute?: boolean;

  validatorCompiler?: FastifySchemaCompiler<SchemaCompiler>;
  serializerCompiler?: FastifySerializerCompiler<SchemaCompiler>;
  bodyLimit?: number;
  logLevel?: LogLevel;
  config?: FastifyContext<ContextConfig>['config'];
  version?: string;
  constraints?: { [name: string]: any },
  prefixTrailingSlash?: 'slash'|'no-slash'|'both';
  errorHandler?: (this: FastifyInstance, error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;
  // TODO: Change to actual type.
  schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error;

  // hooks
  onRequest?: onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | onRequestHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  preParsing?: preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | preParsingHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  preValidation?: preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | preValidationHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  preHandler?: preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | preHandlerHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  preSerialization?: preSerializationHookHandler<unknown, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | preSerializationHookHandler<unknown, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  onSend?: onSendHookHandler<unknown, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | onSendHookHandler<unknown, RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  onResponse?: onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | onResponseHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  onTimeout?: onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> | onTimeoutHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>[];
  onError?: onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError, SchemaCompiler, TypeProvider, Logger> | onErrorHookHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, FastifyError, SchemaCompiler, TypeProvider, Logger>[];
}

/**
 * Route handler method declaration.
 */
export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig, Logger>,
  reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>
// This return type used to be a generic type argument. Due to TypeScript's inference of return types, this rendered returns unchecked.
) => ResolveFastifyReplyReturnType<TypeProvider, SchemaCompiler, RouteGeneric>

/**
 * Shorthand options including the handler function property
 */
export interface RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
> {
  <RouteGeneric extends RouteGenericInterface = RouteGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema, Logger extends FastifyLoggerInstance = FastifyLoggerInstance>(
    path: string,
    opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
  <RouteGeneric extends RouteGenericInterface = RouteGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema, Logger extends FastifyLoggerInstance = FastifyLoggerInstance>(
    path: string,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
  <RouteGeneric extends RouteGenericInterface = RouteGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler = FastifySchema, Logger extends FastifyLoggerInstance = FastifyLoggerInstance>(
    path: string,
    opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
}

/**
 * Fastify route method options.
 */
export interface RouteOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>;
}

export type RouteHandler<
  RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  ContextConfig = ContextConfigDefault,
  SchemaCompiler extends FastifySchema = FastifySchema,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  Logger extends FastifyLoggerInstance = FastifyLoggerInstance
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
  request: FastifyRequest<RouteGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig, Logger>,
  reply: FastifyReply<RawServer, RawRequest, RawReply, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider>
) => RouteGeneric['Reply'] | void | Promise<RouteGeneric['Reply'] | void>

export type DefaultRoute<Request, Reply> = (
  req: Request,
  res: Reply,
) => void;
