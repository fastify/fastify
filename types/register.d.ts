import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyDecorators, FastifyInstance } from './instance'
import { RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase } from './utils'
import { FastifyBaseLogger, FastifyTypeProvider, RawServerDefault } from '../fastify'

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
  logSerializers?: Record<string, (value: any) => string>;
}

export type FastifyRegisterOptions<Options> = (RegisterOptions & Options) | ((instance: FastifyInstance) => RegisterOptions & Options)

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<RawServer extends RawServerBase = RawServerDefault, RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>, RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>, TypeProviderDefault extends FastifyTypeProvider = FastifyTypeProvider, LoggerDefault extends FastifyBaseLogger = FastifyBaseLogger, InstanceDecorators extends FastifyDecorators = object> {
  <Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators>,
    opts: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
  <Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginAsync<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators>,
    opts: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
  <Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators> | FastifyPluginAsync<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators> | Promise<{ default: FastifyPluginCallback<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators> }> | Promise<{ default: FastifyPluginAsync<FastifyPluginOptions, Server, TypeProvider, Logger, Decorators & InstanceDecorators> }>,
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault, Logger extends FastifyBaseLogger = LoggerDefault, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators> | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators> | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators> }> | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators & InstanceDecorators> }>,
    opts: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProviderDefault, InstanceDecorators & Decorators> & InstanceDecorators['fastify'] & Decorators['fastify'];
}
