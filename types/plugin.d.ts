import { AnyFastifyInstance } from './register'

export type FastifyPluginOptions = Record<string, any>

/**
 * FastifyPluginCallback
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export type FastifyPluginCallback<
  Options extends FastifyPluginOptions = FastifyPluginOptions,
  TIn extends AnyFastifyInstance = AnyFastifyInstance
> = (instance: TIn, opts: Options, done: (err?: Error) => void) => void | AnyFastifyInstance

/**
 * FastifyPluginAsync
 *
 * Fastify allows the user to extend its functionalities with plugins. A plugin can be a set of routes, a server decorator or whatever. To activate plugins, use the `fastify.register()` method.
 */
export type FastifyPluginAsync<
  Options extends FastifyPluginOptions = FastifyPluginOptions,
  TIn extends AnyFastifyInstance = AnyFastifyInstance
> = (instance: TIn, opts: Options, done: (err?: Error) => void) => Promise<void | AnyFastifyInstance>

/**
 * Generic plugin type.
 * @deprecated union type doesn't work well with type inference in TS and is therefore deprecated in favor of explicit types. Use `FastifyPluginCallback` or `FastifyPluginAsync` instead. To activate
 * plugins use `FastifyRegister`. https://fastify.dev/docs/latest/Reference/TypeScript/#register
 */
export type FastifyPlugin<
  Options extends FastifyPluginOptions = Record<never, never>,
  Instance extends AnyFastifyInstance = AnyFastifyInstance
> = FastifyPluginCallback<Options, Instance> | FastifyPluginAsync<Options, Instance>
