import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { FastifyBaseLogger, LogLevel } from './logger'
import { FastifyInstance } from './instance'
import { FastifyTypeProvider } from './type-provider'
import { RawServerBase, RawServerDefault } from './utils'

export interface RegisterOptions {
  prefix?: string
  logLevel?: LogLevel
  /** Serializer input is intentionally open for Pino compatibility. */
  logSerializers?: Record<string, (value: any) => string>
}

export type FastifyRegisterOptions<Options> =
  (RegisterOptions & Options) | ((instance: FastifyInstance) => RegisterOptions & Options)

type ImportedPluginFor<
  Options extends FastifyPluginOptions,
  Server extends RawServerBase,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger
> = Promise<{
  default: FastifyPluginCallback<Options, Server, TypeProvider, Logger> | FastifyPluginAsync<Options, Server,
    TypeProvider, Logger>
}>

type RegisterablePluginFor<
  Options extends FastifyPluginOptions,
  Server extends RawServerBase,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger
> =
  | FastifyPluginCallback<Options, Server, TypeProvider, Logger>
  | FastifyPluginAsync<Options, Server, TypeProvider, Logger>
  | ImportedPluginFor<Options, Server, TypeProvider, Logger>

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<
  T = void,
  RawServer extends RawServerBase = RawServerDefault,
  TypeProviderDefault extends FastifyTypeProvider = FastifyTypeProvider,
  LoggerDefault extends FastifyBaseLogger = FastifyBaseLogger
> {
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: FastifyPluginCallback<FastifyPluginOptions, Server, TypeProvider, Logger>
  ): T
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger>,
    opts: FastifyRegisterOptions<Options>
  ): T
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: FastifyPluginAsync<FastifyPluginOptions, Server, TypeProvider, Logger>
  ): T
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: FastifyPluginAsync<Options, Server, TypeProvider, Logger>,
    opts: FastifyRegisterOptions<Options>
  ): T
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: RegisterablePluginFor<FastifyPluginOptions, Server, TypeProvider, Logger>
  ): T
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault
  >(
    plugin: RegisterablePluginFor<Options, Server, TypeProvider, Logger>,
    opts: FastifyRegisterOptions<Options>
  ): T
}
