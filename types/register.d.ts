import { FastifyPlugin, FastifyPluginOptions } from './plugin'
import { LogLevels } from './logger'

export interface FastifyRegister {
  <Options extends FastifyPluginOptions>(plugin: FastifyPlugin<Options>, opts?: (RegisterOptions & Options) | (() => RegisterOptions & Options)): void;
}

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevels;
}
