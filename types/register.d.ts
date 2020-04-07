import { FastifyPlugin, FastifyPluginOptions } from './plugin'
import { LogLevels } from './logger'

/**
 * FastifyRegister
 * 
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister {
  <Options extends FastifyPluginOptions>(
    plugin: FastifyPlugin<Options>,
    opts?: FastifyRegisterOptions<Options>
  ): void;
}

export type FastifyRegisterOptions<Options> = (RegisterOptions & Options) | (() => RegisterOptions & Options)
interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevels;
}
