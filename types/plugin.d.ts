import { FastifyInstance } from './instance'
import { FastifyError } from 'fastify-error'
import { RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'

/**
 * FastifyPlugin
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export interface FastifyPlugin<Options extends FastifyPluginOptions = {}> {
  (
    instance: FastifyInstance<RawServerBase, RawRequestDefaultExpression<RawServerBase>, RawReplyDefaultExpression<RawServerBase>>,
    opts: Options,
    next: (err?: FastifyError) => void
  ): void;
}

export interface FastifyPluginOptions {
  [key: string]: any;
}
