import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyDecorators, FastifyInstance } from './instance'
import { RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase } from './utils'
import { FastifyBaseLogger, FastifyTypeProvider, FastifyTypeProviderDefault, RawServerDefault } from '../fastify'

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
export interface FastifyRegister<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  D extends FastifyDecorators = object,
> {
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, Logger extends FastifyBaseLogger = FastifyBaseLogger, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators>,
    opts?: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider, Decorators & D> & PromiseLike<undefined>;
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, Logger extends FastifyBaseLogger = FastifyBaseLogger, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators>,
    opts?: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider, Decorators & D> & PromiseLike<undefined>;
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault, Logger extends FastifyBaseLogger = FastifyBaseLogger, Decorators extends FastifyDecorators = object>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators> | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators> | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators> }> | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators> }>,
    opts?: FastifyRegisterOptions<Options>
  ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider, Decorators & D> & PromiseLike<undefined>;
}
