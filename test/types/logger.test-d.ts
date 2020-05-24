import { expectType, expectError } from 'tsd'
import fastify, { FastifyLoggerOptions, FastifyLogFn, LogLevel, FastifyLoggerInstance } from '../../fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'

expectType<FastifyLoggerOptions>(fastify().log)

;['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expectType<FastifyLogFn>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel])
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](''))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel]({}))
  expectError(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](0))
})

interface CustomLogger {
  log: {
    specialFunc: (...args: any[]) => void;
  };
}

const customLogger: CustomLogger = {
  log: {
    specialFunc: (...args) => console.log(...args)
  }
}

const serverWithCustomLogger = fastify<
  Server,
  IncomingMessage,
  ServerResponse,
  CustomLogger
>({ logger: customLogger })

expectType<CustomLogger>(serverWithCustomLogger.log)
