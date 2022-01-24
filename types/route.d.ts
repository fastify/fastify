import { FastifyError } from 'fastify-error'
import { FastifyContext } from './context'
import { onErrorHookHandler, onRequestHookHandler, onResponseHookHandler, onSendHookHandler, onTimeoutHookHandler, preHandlerHookHandler, preParsingHookHandler, preSerializationHookHandler, preValidationHookHandler } from './hooks'
import { DefaultFastifyInstanceGenericInterface, FastifyInstance, FastifyInstanceGenericInterface } from './instance'
import { LogLevel } from './logger'
import { FastifyReply, ReplyGenericInterface } from './reply'
import { FastifyRequest, RequestGenericInterface } from './request'
import { FastifySchemaValidationError, FastifySerializerCompiler, FastifyValidatorCompiler } from './schema'
import { ResolveFastifyReplyReturnType } from './type-provider'
import { GetRouteContext, GetRouteReply, GetRouteSchema, HTTPMethods } from './utils'

export interface RouteGenericInterface extends RequestGenericInterface, ReplyGenericInterface {}

export interface FastifyInstanceRouteGenericOnlyInterface {
  Route?: RouteGenericInterface
  Context?: unknown
  Schema?: unknown
}

export interface DefaultFastifyInstanceRouteGenericOnlyInterface {
  Route?: RouteGenericInterface
  Context?: unknown
  Schema?: unknown
}

export interface FastifyInstanceRouteGenericInterface extends FastifyInstanceGenericInterface, FastifyInstanceRouteGenericOnlyInterface {}

export interface DefaultFastifyInstanceRouteGenericInterface extends DefaultFastifyInstanceRouteGenericOnlyInterface, DefaultFastifyInstanceGenericInterface {}

export type DefaultRoute<Request, Reply> = (
  request: Request,
  reply: Reply,
) => void;

/**
 * Route shorthand options for the various shorthand methods
 */
export interface RouteShorthandOptions<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> {
  schema?: GetRouteSchema<Generic>, // originally FastifySchema
  attachValidation?: boolean;
  exposeHeadRoute?: boolean;

  validatorCompiler?: FastifyValidatorCompiler<GetRouteSchema<Generic>>;
  serializerCompiler?: FastifySerializerCompiler<GetRouteSchema<Generic>>;
  bodyLimit?: number;
  logLevel?: LogLevel;
  config?: FastifyContext<GetRouteContext<Generic>>['config'];
  version?: string;
  constraints?: { [name: string]: any },
  prefixTrailingSlash?: 'slash'|'no-slash'|'both';
  errorHandler?: (this: FastifyInstance, error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void;
  // TODO: Change to actual type.
  schemaErrorFormatter?: (errors: FastifySchemaValidationError[], dataVar: string) => Error;

  // hooks
  onRequest?: onRequestHookHandler<Generic> | onRequestHookHandler<Generic>[];
  preParsing?: preParsingHookHandler<Generic> | preParsingHookHandler<Generic>[];
  preValidation?: preValidationHookHandler<Generic> | preValidationHookHandler<Generic>[];
  preHandler?: preHandlerHookHandler<Generic> | preHandlerHookHandler<Generic>[];
  preSerialization?: preSerializationHookHandler<unknown, Generic> | preSerializationHookHandler<unknown, Generic>[];
  onSend?: onSendHookHandler<unknown, Generic> | onSendHookHandler<unknown, Generic>[];
  onResponse?: onResponseHookHandler<Generic> | onResponseHookHandler<Generic>[];
  onTimeout?: onTimeoutHookHandler<Generic> | onTimeoutHookHandler<Generic>[];
  onError?: onErrorHookHandler<FastifyError, Generic> | onErrorHookHandler<FastifyError, Generic>[];
}

/**
 * Route handler method declaration.
 */
export type RouteHandlerMethod<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface,
  ReturnType = ResolveFastifyReplyReturnType<Generic>
> = (
  this: FastifyInstance<Generic>,
  request: FastifyRequest<Generic>,
  reply: FastifyReply<Generic>
) => ReturnType

/**
 * Shorthand options including the handler function property
 */
export interface RouteShorthandOptionsWithHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface,
> extends RouteShorthandOptions<Generic> {
  handler: RouteHandlerMethod<Generic>;
}

/**
 * Fastify Router Shorthand method type that is similar to the Express/Restify approach
 */
export interface RouteShorthandMethod<
  ParentGeneric extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceGenericInterface
> {
  <Generic extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface>(
    path: string,
    opts: RouteShorthandOptions<ParentGeneric & Generic>,
    handler: RouteHandlerMethod<ParentGeneric & Generic>
  ): FastifyInstance<ParentGeneric>;
  <Generic extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface>(
    path: string,
    handler: RouteHandlerMethod<ParentGeneric & Generic>
  ): FastifyInstance<ParentGeneric>;
  <Generic extends FastifyInstanceRouteGenericOnlyInterface = DefaultFastifyInstanceRouteGenericOnlyInterface>(
    path: string,
    opts: RouteShorthandOptionsWithHandler<ParentGeneric & Generic>
  ): FastifyInstance<ParentGeneric>;
}

/**
 * Fastify route method options.
 */
export interface RouteOptions<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> extends RouteShorthandOptions<Generic> {
  method: HTTPMethods | HTTPMethods[];
  url: string;
  handler: RouteHandlerMethod<Generic>;
}

export type RouteHandler<
  Generic extends FastifyInstanceRouteGenericInterface = DefaultFastifyInstanceRouteGenericInterface
> = (
  this: FastifyInstance<Generic>,
  request: FastifyRequest<Generic>,
  reply: FastifyReply<Generic>
) => void | Promise<GetRouteReply<Generic> | void>
