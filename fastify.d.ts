
import { FastifyInstance, FastifyInstanceHttp2GenericInterface, FastifyInstanceHttp2SecureGenericInterface, FastifyInstanceHttpGenericInterface, FastifyInstanceHttpsGenericInterface } from './types/instance'
import { FastifyHttp2Options, FastifyHttp2SecureOptions, FastifyHttpsOptions, FastifyServerOptions } from './types/option'

declare function fastify<Generic extends FastifyInstanceHttp2SecureGenericInterface>(options: FastifyHttp2SecureOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttp2GenericInterface>(options: FastifyHttp2Options<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpsGenericInterface>(options: FastifyHttpsOptions<Generic>): FastifyInstance<Generic>
declare function fastify<Generic extends FastifyInstanceHttpGenericInterface>(options?: FastifyServerOptions<Generic>): FastifyInstance<Generic>
export default fastify


declare module 'fastify-error' {
  interface FastifyError {
    validation?: ValidationResult[];
  }
}

export interface ValidationResult {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: Record<string, string | string[]>;
  message: string;
}

/* Export all additional types */
export { FastifyError } from 'fastify-error'
export type { CallbackFunc as LightMyRequestCallback, Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse } from 'light-my-request'
export { AddContentTypeParser, ConstructorAction, FastifyBodyParser, FastifyContentTypeParser, GetDefaultJsonParser, HasContentTypeParser, ProtoAction } from './types/content-type-parser'
export { FastifyContext, FastifyContextConfig } from './types/context'
export * from './types/hooks'
export { FastifyInstance } from './types/instance'
export { FastifyBaseLogger, FastifyLogFn, FastifyLoggerInstance, FastifyLoggerOptions, LogLevel } from './types/logger'
export * from './types/option'
export { FastifyPlugin, FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions } from './types/plugin'
export * from './types/register'
export { FastifyReply } from './types/reply'
export { FastifyRequest, RequestGenericInterface } from './types/request'
export { RouteHandler, RouteHandlerMethod, RouteOptions, RouteShorthandMethod, RouteShorthandOptions, RouteShorthandOptionsWithHandler } from './types/route'
export { FastifySchema, FastifyValidatorCompiler } from './types/schema'
export { FastifyServerFactory, FastifyServerFactoryHandler } from './types/server-factory'
export { FastifyTypeProvider, FastifyTypeProviderDefault } from './types/type-provider'
export { HTTPMethods, RequestBodyDefault, RequestHeadersDefault, RequestParamsDefault, RequestQuerystringDefault } from './types/utils'
export { fastify }

