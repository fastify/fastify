import { FastifyInstance } from './instance'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifyReply } from './reply'
import { FastifySchema, FastifySchemaCompiler } from './schema'
import { HTTPMethods, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { LogLevel } from './logger'
import { preValidationHookHandler, preHandlerHookHandler, preSerializationHookHandler, onRequestHookHandler, preParsingHookHandler, onResponseHookHandler, onSendHookHandler, onErrorHookHandler } from './hooks'

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault>(
    path: string,
    opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault>(
    path: string,
    handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
> {
  <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault>(
    path: string,
    opts: RouteShorthandOptionsWithHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
  ): FastifyInstance<RawServer, RawRequest, RawReply>;
}

/**
 * Route shorthand options for the various shorthand methods
 */
export interface RouteShorthandOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> {
  schema?: FastifySchema;
  attachValidation?: boolean;
  validatorCompiler?: FastifySchemaCompiler;
  serializerCompiler?: FastifySchemaCompiler;
  bodyLimit?: number;
  logLevel?: LogLevel;
  config?: ContextConfig;
  version?: string;
  prefixTrailingSlash?: boolean;

  // hooks
  onRequest?: onRequestHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | onRequestHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  preParsing?: preParsingHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | preParsingHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  preValidation?: preValidationHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | preValidationHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  preHandler?: preHandlerHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | preHandlerHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  preSerialization?: preSerializationHookHandler<unknown, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | preSerializationHookHandler<unknown, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  onSend?: onSendHookHandler<unknown, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | onSendHookHandler<unknown, RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  onResponse?: onResponseHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | onResponseHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
  onError?: onErrorHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> | onErrorHookHandler<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>[];
}

/**
 * Fastify route method options.
 */
export interface RouteOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>;
}

/**
 * Shorthand options including the handler function property
 */
export interface RouteShorthandOptionsWithHandler<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> extends RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig> {
  handler: RouteHandlerMethod<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>;
}

/**
 * Route handler method declaration.
 */
export type RouteHandlerMethod<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
  ContextConfig = ContextConfigDefault
> = (
  this: FastifyInstance<RawServer, RawRequest, RawReply>,
  request: FastifyRequest<RequestGeneric, RawServer, RawRequest>,
  reply: FastifyReply<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig>
) => void | Promise<any>
