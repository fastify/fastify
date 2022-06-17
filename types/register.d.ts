import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyInstance } from './instance'
import { RawServerBase } from './utils'
import { FastifyTypeProvider } from '../fastify'

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
export interface FastifyRegister<T = void> {
  <Options extends FastifyPluginOptions, RawServer extends RawServerBase, TypeProvider extends FastifyTypeProvider>(
    plugin: FastifyPluginCallback<Options, RawServer, TypeProvider>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions, RawServer extends RawServerBase, TypeProvider extends FastifyTypeProvider>(
    plugin: FastifyPluginAsync<Options, RawServer, TypeProvider>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions, RawServer extends RawServerBase, TypeProvider extends FastifyTypeProvider>(
    plugin: FastifyPluginCallback<Options, RawServer, TypeProvider> | FastifyPluginAsync<Options, RawServer, TypeProvider> | Promise<{ default: FastifyPluginCallback<Options, RawServer, TypeProvider> }> | Promise<{ default: FastifyPluginAsync<Options, RawServer, TypeProvider> }>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
}
