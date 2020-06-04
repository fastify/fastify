import { FastifyPlugin, FastifyPluginOptions } from './plugin'
import { LogLevel } from './logger'

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<T = void> {
  <Options extends FastifyPluginOptions>(
    plugin: FastifyPlugin<Options>,
    opts?: FastifyRegisterOptions<Options>
  ): T;
}

export type FastifyRegisterOptions<Options> = (RegisterOptions & Options) | (() => RegisterOptions & Options)

interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
}
