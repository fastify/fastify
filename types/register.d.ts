import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'
import { FastifyPlugin, FastifyPluginOptions } from './plugin'
import { LogLevels } from './logger'

export interface FastifyRegister<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> {
  <Options = FastifyPluginOptions>(plugin: FastifyPlugin<Options, RawServer>, opts?: (RegisterOptions & Options) | (() => RegisterOptions & Options)): void;
}

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevels;
}
