import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression } from './utils'

/**
 * Standard Fastify logging function
 */
export interface FastifyLogFn {
  (msg: string, ...args: any[]): void;
  (obj: object, msg?: string, ...args: any[]): void;
}

export type LogLevels = 'info' | 'error' | 'debug' | 'fatal' | 'warn' | 'trace'

/**
 * Fastify Custom Logger options.
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
  info: FastifyLogFn;
  error: FastifyLogFn;
  debug: FastifyLogFn;
  fatal: FastifyLogFn;
  warn: FastifyLogFn;
  trace: FastifyLogFn;
  child: FastifyLogFn | FastifyLoggerOptions<RawServer>;
  genReqId?: string;
}
