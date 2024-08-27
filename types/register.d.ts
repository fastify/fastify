import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyDecorators, FastifyInstance } from './instance'
import { RawServerBase } from './utils'
import { FastifyBaseLogger, FastifyTypeProvider, RawServerDefault } from '../fastify'

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
  logSerializers?: Record<string, (value: any) => string>;
}

export type FastifyRegisterOptions<Options> =
  | (RegisterOptions & Options)
  | ((instance: FastifyInstance) => RegisterOptions & Options)

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */

export interface FastifyRegister<
  RawServer extends RawServerBase = RawServerDefault,
  TypeProviderDefault extends FastifyTypeProvider = FastifyTypeProvider,
  Decorators extends FastifyDecorators = FastifyDecorators
> {
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger,
    Plugin extends FastifyPluginCallback<
      Options,
      Server,
      TypeProvider,
      Logger,
      Decorators
    > = FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators>
  >(
    plugin: Plugin,
    opts?: FastifyRegisterOptions<Options>,
  ): ReturnType<Plugin> & PromiseLike<undefined>;
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger,
    Plugin extends FastifyPluginAsync<
      Options,
      Server,
      TypeProvider,
      Logger,
      Decorators
    > = FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators>
  >(
    plugin: Plugin,
    opts?: FastifyRegisterOptions<Options>,
  ): Awaited<ReturnType<Plugin>>;
  // TODO:
  // <
  //   Options extends FastifyPluginOptions,
  //   Server extends RawServerBase = RawServer,
  //   TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
  //   Logger extends FastifyBaseLogger = FastifyBaseLogger,
  //   Plugin extends
  //     | FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators>
  //     | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators>
  //     | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators> }>
  //     | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators> }>,
  // >(
  //   plugin: Plugin,
  //   opts?: FastifyRegisterOptions<Options>,
  // ): ReturnType<Plugin> & PromiseLike<undefined>;
}
