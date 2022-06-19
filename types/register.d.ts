import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyInstance } from './instance'
import { RawServerBase } from './utils'
import { FastifyTypeProvider, RawServerDefault } from '../fastify'

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
export interface FastifyRegister<T = void, RawServer extends RawServerBase = RawServerDefault, TypeProviderDefault extends FastifyTypeProvider = FastifyTypeProvider> {
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault>(
    plugin: FastifyPluginAsync<Options, Server, TypeProvider>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions, Server extends RawServerBase = RawServer, TypeProvider extends FastifyTypeProvider = TypeProviderDefault>(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider> | FastifyPluginAsync<Options, Server, TypeProvider> | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider> }> | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider> }>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
}
