import * as http from 'http'
import * as net from 'net'

import { FastifyError } from './error'
import { RawServerBase, RawServerDefault, RawRequestBase, RawRequestDefault, RawReplyBase, RawReplyDefault } from './utils';

/**
 * Standard Fastify logging function
 */
export interface FastifyLoggerWriteFn {
  (msg: string, ...args: any[]): void
}

/**
 * Fastify logging function with an object as the first argument
 */
export interface FastifyLoggerWriteFn {
  (obj: { [key: string]: any }, msg?: string, ...args: any[]): void
}

export type LogLevels = 'info' | 'error' | 'debug' | 'fatal' | 'warn' | 'trace'

/**
 * Fastify Custom Logger options.
 */
export interface FastifyLoggerOptions<
  RawServer extends RawServerBase = RawServerDefault,
  RawRequest extends RawRequestBase = RawRequestDefault<RawServer>,
  RawReply extends RawReplyBase = RawReplyDefault<RawServer>
> {
  serializers?: {
    req: (req: RawRequest) => {
      method: string,
      url: string,
      version: string,
      hostname: string,
      remoteAddress: string,
      remotePort: number
    },
    err: (err: FastifyError) => {
      type: string;
      message: string;
      stack: string;
      [key: string]: any;
    },
    res: (res: RawReply) => {
      statusCode: string | number
    }
  };
  info: FastifyLoggerWriteFn;
  error: FastifyLoggerWriteFn;
  debug: FastifyLoggerWriteFn;
  fatal: FastifyLoggerWriteFn;
  warn: FastifyLoggerWriteFn;
  trace: FastifyLoggerWriteFn;
  child: FastifyLoggerWriteFn | FastifyLoggerOptions<RawServer>;
  genReqId?: string;
}

/**
Planning on using Pino as your logger?
1. Download and install pino types `npm i -s @types/pino
2. Add the following code block to a type declaration file
```typescript
import * as pino from 'pino' 
namespace fastify {
  interface FastifyInterface {
    logger: FastifyLogger | pino
  }
}
```
3. You now have access to the pino logger typings
*/
export type PinoObject = object
