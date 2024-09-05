import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { LogLevel } from './logger'
import { FastifyDecorators, FastifyInstance } from './instance'
import {RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase} from './utils'
import {FastifyBaseLogger, FastifyTypeProvider, FastifyTypeProviderDefault, RawServerDefault} from '../fastify'

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
  logSerializers?: Record<string, (value: any) => string>;
}

export type FastifyRegisterOptions<Options> =
  | (RegisterOptions & Options)
  | ((instance: FastifyInstance) => RegisterOptions & Options)

export type AnyFastifyInstance = FastifyInstance<any, any, any, any, any, any>

export type ExtractDecorators<T extends AnyFastifyInstance> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : never

export type ExtractTypeProvider<T extends FastifyInstance> = T extends FastifyInstance<any, any, any, any, infer U, any> ? U : never

export type ExtractLogger<T extends FastifyInstance> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : never

export type ApplyPluginChanges<
  TInstance extends FastifyInstance = FastifyInstance,
  PluginReturnType extends FastifyInstance = FastifyInstance
> = FastifyInstance<
  any,
  any,
  any,
  any,
  ExtractTypeProvider<TInstance>,
  ExtractDecorators<TInstance> & ExtractDecorators<PluginReturnType>
>

type TypeWithGeneric<T> = T[]
type extractGeneric<Type> = Type extends TypeWithGeneric<infer X> ? X : never

// type extracted = extractGeneric<TypeWithGeneric<number>>
// extracted === number

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */

export interface FastifyRegister<
  TInstance extends AnyFastifyInstance = AnyFastifyInstance,
  // RawServer extends RawServerBase = RawServerDefault,
  // RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  // RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  // TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  // Logger extends FastifyBaseLogger = FastifyBaseLogger,
  // Decorators extends FastifyDecorators = FastifyDecorators
> {
  <
    Options extends FastifyPluginOptions,
    Plugin extends FastifyPluginCallback<Options, TInstance> = FastifyPluginCallback<Options, TInstance>
  >(
    plugin: Plugin,
    opts?: FastifyRegisterOptions<Options>,
  ): ApplyPluginChanges<TInstance, ReturnType<Plugin>>
  // <
  //   Options extends FastifyPluginOptions,
  //   Plugin extends FastifyPluginAsync<
  //     Options,
  //     RawServer,
  //     TypeProvider,
  //     Logger,
  //     Decorators
  //   > = FastifyPluginAsync<Options, RawServer, TypeProvider, Logger, Decorators>
  // >(
  //   plugin: Plugin,
  //   opts?: FastifyRegisterOptions<Options>,
  // ): FastifyInstance<
  //   RawServer,
  //   RawRequest,
  //   RawReply,
  //   Logger,
  //   TypeProvider,
  //   Decorators & ExtractDecorators<Awaited<ReturnType<Plugin>>>
  // >
  // TODO:
  // <
  //   Options extends FastifyPluginOptions,
  //   Server extends RawServerBase = RawServer,
  //   TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
  //   Logger extends FastifyBaseLogger = FastifyBaseLogger,
  //   Plugin extends
  //     | FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators>
  //     | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators>
  //     | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators> }>
  //     | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators> }>,
  // >(
  //   plugin: Plugin,
  //   opts?: FastifyRegisterOptions<Options>,
  // ): ReturnType<Plugin> & PromiseLike<undefined>;
}
