import { FastifyInstance } from './instance'
import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'

/**
 * FastifyPlugin
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export interface FastifyPlugin<
  Options extends FastifyPluginOptions = {},
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> {
  (
    instance: FastifyInstance<RawServer, RawRequest, RawReply>,
    opts: Options,
    next: (err?: FastifyError) => void
  ): void;
}

export interface FastifyPluginOptions {
  [key: string]: any;
}
