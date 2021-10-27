import { FastifyError } from 'fastify-error'
import { RouteGenericInterface } from './route'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault } from './utils'
import { FastifyTypeProvider, FastifyTypeProviderDefault } from './typeProvider'
import { FastifySchema } from './schema'

import pino from 'pino'

/**
 * Standard Fastify logging function
 */
export type FastifyLogFn = pino.LogFn

export type LogLevel = pino.Level

export type SerializerFn = pino.SerializerFn

export type Bindings = pino.Bindings

export type FastifyLoggerInstance = pino.Logger
export type FastifyBaseLogger = pino.BaseLogger & {
  child(bindings: Bindings): FastifyBaseLogger
}

export type PrettyOptions = pino.PrettyOptions & { suppressFlushSyncWarning?: boolean }

export interface FastifyLoggerStreamDestination {
  write(msg: string): void;
}

export type PinoLoggerOptions = pino.LoggerOptions

/**
 * Fastify Custom Logger options.
 */
export interface FastifyLoggerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends FastifyRequest<RouteGenericInterface, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, FastifyTypeProvider> = FastifyRequest<RouteGenericInterface, RawServer, RawRequestDefaultExpression<RawServer>, FastifySchema, FastifyTypeProviderDefault>,
  RawReply extends FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>, RouteGenericInterface, ContextConfigDefault, FastifySchema, FastifyTypeProvider> = FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>, RouteGenericInterface, ContextConfigDefault, FastifySchema, FastifyTypeProviderDefault>,
> {
  serializers?: {
    req?: (req: RawRequest) => {
      method?: string;
      url?: string;
      version?: string;
      hostname?: string;
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
    res?: (res: RawReply) => {
      statusCode: string | number;
      [key: string]: unknown;
    };
  };
  level?: string;
  file?: string;
  genReqId?: (req: RawRequest) => string;
  prettyPrint?: boolean | PrettyOptions;
  stream?: FastifyLoggerStreamDestination;
}
