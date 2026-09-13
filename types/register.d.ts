import { FastifyPluginOptions, FastifyPluginCallback, FastifyPluginAsync } from './plugin'
import { FastifyBaseLogger, LogLevel } from './logger'
import { FastifyInstance } from './instance'
import { FastifyTypeProvider } from './type-provider'
import { RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from './utils'

export interface RegisterOptions {
  prefix?: string;
  logLevel?: LogLevel;
  logSerializers?: Record<string, (value: any) => string>;
}

export type FastifyRegisterOptions<Options, Instance extends object = FastifyInstance> = (RegisterOptions & Options)
  | ((instance: Instance) => RegisterOptions & Options)

type ImportedPluginFor<
  Options extends FastifyPluginOptions,
  Server extends RawServerBase,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger,
  Instance extends object
> = Promise<{
  default: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Instance> | FastifyPluginAsync<Options, Server,
    TypeProvider, Logger, Instance>
}>

type RegisterablePluginFor<
  Options extends FastifyPluginOptions,
  Server extends RawServerBase,
  TypeProvider extends FastifyTypeProvider,
  Logger extends FastifyBaseLogger,
  Instance extends object
> =
  | FastifyPluginCallback<Options, Server, TypeProvider, Logger, Instance>
  | FastifyPluginAsync<Options, Server, TypeProvider, Logger, Instance>
  | ImportedPluginFor<Options, Server, TypeProvider, Logger, Instance>

/**
 * FastifyRegister
 *
 * Function for adding a plugin to fastify. The options are inferred from the passed in FastifyPlugin parameter.
 */
export interface FastifyRegister<
  T = void,
  RawServer extends RawServerBase = RawServerDefault,
  TypeProviderDefault extends FastifyTypeProvider = FastifyTypeProvider,
  LoggerDefault extends FastifyBaseLogger = FastifyBaseLogger,
  InstanceDefault extends object = FastifyInstance<RawServer, RawRequestDefaultExpression<RawServer>,
    RawReplyDefaultExpression<RawServer>, LoggerDefault, TypeProviderDefault>
> {
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: FastifyPluginCallback<FastifyPluginOptions, Server, TypeProvider, Logger, Instance>
  ): T;
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: FastifyPluginCallback<Options, Server, TypeProvider, Logger, Instance>,
    opts: FastifyRegisterOptions<Options, InstanceDefault>
  ): T;
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: FastifyPluginAsync<FastifyPluginOptions, Server, TypeProvider, Logger, Instance>
  ): T;
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: FastifyPluginAsync<Options, Server, TypeProvider, Logger, Instance>,
    opts: FastifyRegisterOptions<Options, InstanceDefault>
  ): T;
  <
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: RegisterablePluginFor<FastifyPluginOptions, Server, TypeProvider, Logger, Instance>
  ): T;
  <
    Options extends FastifyPluginOptions,
    Server extends RawServerBase = RawServer,
    TypeProvider extends FastifyTypeProvider = TypeProviderDefault,
    Logger extends FastifyBaseLogger = LoggerDefault,
    Instance extends object = InstanceDefault
  >(
    plugin: RegisterablePluginFor<Options, Server, TypeProvider, Logger, Instance>,
    opts: FastifyRegisterOptions<Options, InstanceDefault>
  ): T;
}
