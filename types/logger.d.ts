import { FastifyError } from 'fastify-error'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'
import { FastifyRequest, RequestGenericInterface } from './request'

/**
 * Standard Fastify logging function
 */
export interface FastifyLogFn {
  (msg: string, ...args: unknown[]): void;
  (obj: object, msg?: string, ...args: unknown[]): void;
}

export type LogLevel = 'info' | 'error' | 'debug' | 'fatal' | 'warn' | 'trace'

export type SerializerFn = (value: unknown) => unknown;

export interface Bindings {
  level?: LogLevel | string;
  serializers?: { [key: string]: SerializerFn };
  [key: string]: unknown;
}

export interface FastifyLoggerInstance {
  info: FastifyLogFn;
  warn: FastifyLogFn;
  error: FastifyLogFn;
  fatal: FastifyLogFn;
  trace: FastifyLogFn;
  debug: FastifyLogFn;
  child(bindings: Bindings): FastifyLoggerInstance;
}

/**
 * Fastify Custom Logger options. To enable configuration of all Pino options,
 * refer to this example:
 * https://github.com/fastify/fastify/blob/2f56e10a24ecb70c2c7950bfffd60eda8f7782a6/docs/TypeScript.md#example-5-specifying-logger-types
 */
export interface FastifyLoggerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
  RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>
> {
  serializers?: {
    req: (req: RawRequest) => {
      method: string;
      url: string;
      version: string;
      hostname: string;
      remoteAddress: string;
      remotePort: number;
    };
    err: (err: FastifyError) => {
      type: string;
      message: string;
      stack: string;
      [key: string]: any;
    };
    res: (res: RawReply) => {
      statusCode: string | number;
    };
  };
  level?: string;
  genReqId?: <RequestGeneric extends RequestGenericInterface = RequestGenericInterface>(req: FastifyRequest<RequestGeneric, RawServer, RawRequest>) => string;
}
