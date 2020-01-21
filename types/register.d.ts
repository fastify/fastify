import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'
import { FastifyPlugin, FastifyPluginOptions } from './plugin'
import { LogLevels } from './logger'

/**
 * FastifyRegister
 * 
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> {
  <Options = FastifyPluginOptions>(
    plugin: FastifyPlugin<Options, RawServer>, 
    opts?: FastifyRegisterOptions<Options>
  ): void;
}

export type FastifyRegisterOptions<Options> = (RegisterOptions & Options) | (() => RegisterOptions & Options)
interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevels;
}
