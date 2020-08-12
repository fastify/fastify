import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<T = void> {
  <Options extends FastifyPluginOptions>(
    plugin: FastifyPluginCallback<Options>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions>(
    plugin: FastifyPluginAsync<Options>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
  <Options extends FastifyPluginOptions>(
    plugin: FastifyPluginCallback<Options> | FastifyPluginAsync<Options> | Promise<{ default: FastifyPluginCallback<Options> }> | Promise<{ default: FastifyPluginAsync<Options> }>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
}

export type FastifyRegisterOptions<Options> = (RegisterOptions & Options) | (() => RegisterOptions & Options)

interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
}
