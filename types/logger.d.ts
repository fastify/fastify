import pino from 'pino'
import { DefaultFastifyInstanceGenericInterface, FastifyInstanceGenericInterface } from './instance'
import { FastifyReply } from './reply'
import { FastifyRequest } from './request'
import { GetRequest } from './utils'

/**
 * Standard Fastify logging function
 */
export type FastifyLogFn = pino.LogFn

export type LogLevel = pino.Level

export type Bindings = pino.Bindings

export type FastifyLoggerInstance = pino.Logger
// TODO make pino export BaseLogger again
// export type FastifyBaseLogger = pino.BaseLogger & {
export type FastifyBaseLogger = pino.Logger & {
  child(bindings: Bindings): FastifyBaseLogger
}

export interface FastifyLoggerStreamDestination {
  write(msg: string): void;
}

export type PinoLoggerOptions = pino.LoggerOptions

/**
 * Fastify Custom Logger options.
 */
export interface FastifyLoggerOptions<Generic extends FastifyInstanceGenericInterface = DefaultFastifyInstanceGenericInterface> {
  serializers?: {
    req?: (req: FastifyRequest<Generic>) => {
      method?: string;
      url?: string;
      version?: string;
      hostname?: string;
      remoteAddress?: string;
      remotePort?: number;
      [key: string]: unknown;
    };
    err?: (err: any) => {
      type: string;
      message: string;
      stack: string;
      [key: string]: unknown;
    };
    res?: (res: FastifyReply<Generic>) => {
      statusCode: string | number;
      [key: string]: unknown;
    };
  };
  level?: string;
  file?: string;
  genReqId?: (req: GetRequest<Generic>) => string;
  stream?: FastifyLoggerStreamDestination;
}
