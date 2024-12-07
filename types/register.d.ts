import { FastifyPlugin } from './plugin'
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

/**
 * Created primarily for plugins. Having a specific server/request/reply can cause issues when combining plugins
 * which are agnostic when it comes to the instance they are being registered on, and they only care about the
 * decorators. If more control is needed, FastifyInstance can be used with the specific types.
 */
export type AnyFastifyInstance = FastifyInstance<any, any, any, any, any, FastifyDecorators>

export type ExtractDecorators<T extends AnyFastifyInstance> = T extends FastifyInstance<any, any, any, any, any, infer U> ? U : never

type Flavor<T, FlavorT> = T & { __flavor: FlavorT }

export type UnEncapsulatedPlugin<Plugin extends FastifyPlugin<any, any>> =
  Flavor<Plugin, 'unEncapsulated'>

export type ApplyPluginChanges<
  TInstance extends AnyFastifyInstance,
  Plugin extends FastifyPlugin<any, TInstance>
> =
  Plugin extends UnEncapsulatedPlugin<Plugin>
    ? Awaited<ReturnType<Plugin>> extends AnyFastifyInstance
      ? ApplyDecorators<TInstance, ExtractDecorators<TInstance> & ExtractDecorators<Awaited<ReturnType<Plugin>>>>
      : never
    : TInstance

export type ApplyDecorators<
  TInstance extends AnyFastifyInstance,
  TDecorators extends FastifyDecorators
> =
  TInstance extends FastifyInstance<infer Server, infer Request, infer Response, infer Logger, infer TypeProvider, infer Decorators>
    ? FastifyInstance<Server, Request, Response, Logger, TypeProvider, Decorators & TDecorators>
    : TInstance

// using a tuple to allow for recursively applying multiple plugins
export type FastifyDependencies = [FastifyPlugin<any, any>, ...FastifyPlugin<any, any>[]]

export type ApplyDependencies<F extends FastifyPlugin, T extends FastifyDependencies> = F extends (first: infer First, ...rest: infer Rest) => infer R
  ? First extends AnyFastifyInstance
    ? (instance: EnhanceArray<First, T>, ...rest: Rest) => R
    : never
  : F

export type EnhanceArray<U extends AnyFastifyInstance, T extends FastifyDependencies> =
  T extends [infer First, ...infer Rest]
    ? First extends FastifyDependencies[0]
      ? Rest extends FastifyDependencies
        ? EnhanceArray<ApplyPluginChanges<U, First>, Rest>
        : ApplyPluginChanges<U, First>
      : U
    : U

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export type FastifyRegister = FastifyInstance['register']
