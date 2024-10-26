import { FastifyPluginOptions, FastifyPlugin } from './plugin'
import { LogLevel } from './logger'
import { FastifyDecorators, FastifyInstance } from './instance'

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
  logSerializers?: Record<string, (value: any) => string>;
}

export type FastifyRegisterOptions<Options> =
  | (RegisterOptions & Options)
  | ((instance: FastifyInstance) => RegisterOptions & Options)

export type AnyFastifyInstance = FastifyInstance<any, any, any, any, any, FastifyDecorators>

export type ExtractDecorators<T extends AnyFastifyInstance> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : never

export type ExtractTypeProvider<T extends FastifyInstance> = T extends FastifyInstance<any, any, any, any, infer U, any> ? U : never

export type ExtractLogger<T extends FastifyInstance> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : never

type Flavor<T, FlavorT> = T & { __flavor: FlavorT }

export type UnEncapsulatedPlugin<Plugin extends FastifyPlugin<any, any>> = Flavor<Plugin, 'unEncapsulated'>

export type ApplyPluginChanges<
  TInstance extends AnyFastifyInstance,
  Options extends FastifyPluginOptions,
  Plugin extends FastifyPlugin<Options, TInstance>
> =
  Plugin extends UnEncapsulatedPlugin<Plugin>
    ? Awaited<ReturnType<Plugin>> extends FastifyInstance
      ? FastifyInstance<any, any, any, any, any, ExtractDecorators<TInstance> & ExtractDecorators<Awaited<ReturnType<Plugin>>>>
      : TInstance
    : TInstance

// using a tuple to allow for recursively applying multiple plugins
export type FastifyDependencies = [FastifyPlugin, ...FastifyPlugin[]]

export type ApplyDependencies<F extends FastifyPlugin, T extends FastifyDependencies> = F extends (first: infer First, ...rest: infer Rest) => infer R
  ? First extends AnyFastifyInstance
    ? (instance: EnhanceArray<First, T>, ...rest: Rest) => R
    : never
  : F

export type EnhanceArray<U extends AnyFastifyInstance, T extends FastifyDependencies> =
  T extends [infer First, ...infer Rest]
    ? First extends FastifyPlugin
      ? Rest extends FastifyDependencies
        ? EnhanceArray<ApplyPluginChanges<U, any, First>, Rest>
        : ApplyPluginChanges<U, any, First>
      : U
    : U

export type FastifyRegister = FastifyInstance['register']

// export type FastifyRegisterCallback<Options extends FastifyPluginOptions, Instance ex> =
//   FastifyPlugin<Options, this>
//
/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */

// export interface FastifyRegister<
//   TInstance extends AnyFastifyInstance = AnyFastifyInstance,
//   // RawServer extends RawServerBase = RawServerDefault,
//   // RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
//   // RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
//   // TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
//   // Logger extends FastifyBaseLogger = FastifyBaseLogger,
//   // Decorators extends FastifyDecorators = FastifyDecorators
// > {
//   <
//     Options extends FastifyPluginOptions,
//     Plugin extends FastifyPluginCallback<Options, TInstance> = FastifyPluginCallback<Options, TInstance>
//   >(
//     plugin: Plugin,
//     opts?: FastifyRegisterOptions<Options>,
//   ): any
//   // <
//   //   Options extends FastifyPluginOptions,
//   //   Plugin extends FastifyPluginAsync<
//   //     Options,
//   //     RawServer,
//   //     TypeProvider,
//   //     Logger,
//   //     Decorators
//   //   > = FastifyPluginAsync<Options, RawServer, TypeProvider, Logger, Decorators>
//   // >(
//   //   plugin: Plugin,
//   //   opts?: FastifyRegisterOptions<Options>,
//   // ): FastifyInstance<
//   //   RawServer,
//   //   RawRequest,
//   //   RawReply,
//   //   Logger,
//   //   TypeProvider,
//   //   Decorators & ExtractDecorators<Awaited<ReturnType<Plugin>>>
//   // >
//   // TODO:
//   // <
//   //   Options extends FastifyPluginOptions,
//   //   Server extends RawServerBase = RawServer,
//   //   TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
//   //   Logger extends FastifyBaseLogger = FastifyBaseLogger,
//   //   Plugin extends
//   //     | FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators>
//   //     | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators>
//   //     | Promise<{ default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Decorators> }>
//   //     | Promise<{ default: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Decorators> }>,
//   // >(
//   //   plugin: Plugin,
//   //   opts?: FastifyRegisterOptions<Options>,
//   // ): ReturnType<Plugin> & PromiseLike<undefined>;
// }
