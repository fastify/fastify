import { FastifyInstance } from './instance'
import { RawServerBase, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'

/**
 * FastifyPluginCallback
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export type FastifyPluginCallback<Options extends FastifyPluginOptions = {}> = (
  instance: FastifyInstance<RawServerBase, RawRequestDefaultExpression<RawServerBase>, RawReplyDefaultExpression<RawServerBase>>,
  opts: Options,
  next: (err?: Error) => void
) => void

/**
 * FastifyPluginAsync
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export type FastifyPluginAsync<Options extends FastifyPluginOptions = {}> = (
  instance: FastifyInstance<RawServerBase, RawRequestDefaultExpression<RawServerBase>, RawReplyDefaultExpression<RawServerBase>>,
  opts: Options
) => Promise<void>;

/**
 * Generic plugin type.
 * @deprecated union type doesn't work well with type inference in TS and is therefore deprecated in favor of explicit types. See FastifyRegister.
 */
export type FastifyPlugin<Options extends FastifyPluginOptions = {}> = FastifyPluginCallback<Options> | FastifyPluginAsync<Options>

export interface FastifyPluginOptions {
  [key: string]: any;
}
