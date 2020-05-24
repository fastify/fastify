import { expectType, expectError } from 'tsd'
import fastify, { FastifyLogFn, LogLevel, FastifyLoggerInstance } from '../../fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import * as pino from 'pino'

expectType<FastifyLoggerInstance>(fastify().log)

;['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expectType<FastifyLogFn>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel])
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](''))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel]({}))
  expectError(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](0))
})

interface CustomLogger extends FastifyLoggerInstance {
  customMethod(msg: string, ...args: unknown[]): void
}

class CustomLoggerImpl implements CustomLogger {
  customMethod(msg: string, ...args: unknown[]) { console.log(msg, args) }

  // Implementation signature must be compatible with all overloads of FastifyLogFn
  info(arg1: string | object, arg2?: string | unknown, ...args: unknown[]): void {
    console.log(arg1, arg2, ...args)
  }
  warn(...args: unknown[]) { console.log(args) }
  error(...args: unknown[]) { console.log(args) }
  fatal(...args: unknown[]) { console.log(args) }
  trace(...args: unknown[]) { console.log(args) }
  debug(...args: unknown[]) { console.log(args) }
  child() { return new CustomLoggerImpl() }
}

const customLogger = new CustomLoggerImpl()

const serverWithCustomLogger = fastify<
  Server,
  IncomingMessage,
  ServerResponse,
  CustomLoggerImpl
>({ logger: customLogger })

expectType<CustomLoggerImpl>(serverWithCustomLogger.log)

const serverWithPino = fastify<
  Server,
  IncomingMessage,
  ServerResponse,
  pino.Logger
>({
  logger: pino({
    level: 'info',
    redact: ['x-userinfo']
  })
})

expectType<pino.Logger>(serverWithPino.log)

const serverWithLogOptions = fastify<
  Server,
  IncomingMessage,
  ServerResponse
>({
  logger: {
    level: 'info'
  }
})

expectType<FastifyLoggerInstance>(serverWithLogOptions.log)

const serverAutoInferringTypes = fastify({
  logger: {
    level: 'info'
  }
})

expectType<FastifyLoggerInstance>(serverAutoInferringTypes.log)

const serverWithAutoInferredPino = fastify({
  logger: pino({
    level: 'info',
    redact: ['x-userinfo']
  })
})

expectType<pino.Logger>(serverWithAutoInferredPino.log)
