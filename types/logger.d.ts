import { FastifyError } from '@fastify/error'
import { FastifyInstance } from './instance'
import { FastifyReply } from './reply'
import { FastifyRequest } from './request'
import { RouteGenericInterface } from './route'
import { FastifySchema } from './schema'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './type-provider'
import { ContextConfigDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault } from './utils'

import type {
  BaseLogger,
  LogFn as FastifyLogFn,
  LevelWithSilent as LogLevel,
  Bindings,
  ChildLoggerOptions,
  LoggerOptions as PinoLoggerOptions
} from 'pino'

export type {
  FastifyLogFn,
  LogLevel,
  Bindings,
  ChildLoggerOptions,
  PinoLoggerOptions
}

export interface FastifyBaseLogger extends Pick<BaseLogger, 'level' | 'info' | 'error' | 'debug' | 'fatal' | 'warn' | 'trace' | 'silent'> {
  child(bindings: Bindings, options?: ChildLoggerOptions): FastifyBaseLogger
}

export interface FastifyLoggerStreamDestination {
  write(msg: string): void;
}

/**
 * Fastify Custom Logger options.
 */
export interface FastifyLoggerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends FastifyRequest<
    RouteGenericInterface,
    RawServer,
    RawRequestDefaultExpression<RawServer>,
    FastifySchema,
    FastifyTypeProvider
  > = FastifyRequest<
    RouteGenericInterface,
    RawServer,
    RawRequestDefaultExpression<RawServer>,
    FastifySchema,
    FastifyTypeProviderDefault
  >,
  RawReply extends FastifyReply<
    RouteGenericInterface,
    RawServer,
    RawRequestDefaultExpression<RawServer>,
    RawReplyDefaultExpression<RawServer>,
    ContextConfigDefault,
    FastifySchema,
    FastifyTypeProvider
  > = FastifyReply<
    RouteGenericInterface,
    RawServer,
    RawRequestDefaultExpression<RawServer>,
    RawReplyDefaultExpression<RawServer>,
    ContextConfigDefault,
    FastifySchema,
    FastifyTypeProviderDefault
  >
> {
  serializers?: {
    req?: (req: RawRequest) => {
      method?: string;
      url?: string;
      version?: string;
      host?: string;
      remoteAddress?: string;
      remotePort?: number;
      [key: string]: unknown;
    };
    err?: (err: FastifyError) => {
      type: string;
      message: string;
      stack: string;
      [key: string]: unknown;
    };
    res?: (res: Partial<RawReply>) => {
      statusCode?: string | number;
      [key: string]: unknown;
    };
  };
  level?: string;
  file?: string;
  genReqId?: (req: RawRequest) => string;
  stream?: FastifyLoggerStreamDestination;
}

export interface LogControllerOptions {
  disableRequestLogging?: boolean | ((req: FastifyRequest) => boolean)
  requestIdLogLabel?: string
}

type LogMetadata = Record<string, unknown>

export declare class LogController {
  disableRequestLogging: boolean | ((req: FastifyRequest) => boolean)
  requestIdLogLabel: string

  constructor (options?: LogControllerOptions)

  isLogDisabled (request: FastifyRequest): boolean
  incomingRequest (request: FastifyRequest, reply: FastifyReply, metadata?: Record<string, unknown>): void
  requestCompleted (
    error: Error | null | undefined,
    request: FastifyRequest,
    reply: FastifyReply,
    metadata?: Record<string, unknown>
  ): void
  defaultErrorLog (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: Record<string, unknown>): void
  streamError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: Record<string, unknown>): void
  routeNotFound (request: FastifyRequest, reply: FastifyReply, metadata?: Record<string, unknown>): void
  writeHeadError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: Record<string, unknown>): void
  serializerError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata: { statusCode: number }): void
  serviceUnavailable (logger: FastifyBaseLogger, server: FastifyInstance): void
  onRequestAbortError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  replyAlreadySent (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  headersAlreadySent (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  replyThenRejection (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  streamHeadersAlreadySent (request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  streamPayloadNotClosable (request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  trailerError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata: { trailerName: string }): void
  notFoundInNotFoundHandler (request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  fourOhFourFallback (
    request: FastifyRequest,
    reply: FastifyReply,
    metadata: { router: { prettyPrint (): string } }
  ): void
  promiseRejectedAfterSent (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  headStreamError (error: Error, request: FastifyRequest, reply: FastifyReply, metadata?: LogMetadata): void
  onListenHookError (logger: FastifyBaseLogger, server: FastifyInstance, error: Error): void
  clientError (
    logger: FastifyBaseLogger,
    server: FastifyInstance,
    error: Error,
    label: 'timeout' | 'header_overflow' | 'error'
  ): void
  serverListening (
    logger: FastifyBaseLogger,
    server: FastifyInstance,
    address: string,
    listenTextResolver: (address: string) => string
  ): void
}

export interface FastifyChildLoggerFactory<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
  Logger extends FastifyBaseLogger = FastifyBaseLogger,
  TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault
> {
  /**
   * @param logger The parent logger
   * @param bindings The bindings object that will be passed to the child logger
   * @param childLoggerOpts The logger options that will be passed to the child logger
   * @param rawReq The raw request
   * @this The fastify instance
   * @returns The child logger instance
   */
  (
    this: FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>,
    logger: Logger,
    bindings: Bindings,
    childLoggerOpts: ChildLoggerOptions,
    rawReq: RawRequest
  ): Logger
}
