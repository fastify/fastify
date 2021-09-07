import { FastifyError } from 'fastify-error'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'
import { RouteGenericInterface } from './route'
import { FastifyRequest } from './request'
import { FastifyReply } from './reply'
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

/**
 * Fastify Custom Logger options. To enable configuration of all Pino options,
 * refer to this example:
 * https://github.com/fastify/fastify/blob/2f56e10a24ecb70c2c7950bfffd60eda8f7782a6/docs/TypeScript.md#example-5-specifying-logger-types
 */
export interface FastifyLoggerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends FastifyRequest<RouteGenericInterface, RawServer, RawRequestDefaultExpression<RawServer>> = FastifyRequest<RouteGenericInterface, RawServer, RawRequestDefaultExpression<RawServer>>,
  RawReply extends FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>> = FastifyReply<RawServer, RawRequestDefaultExpression<RawServer>, RawReplyDefaultExpression<RawServer>>
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
