import { expectType, expectError } from 'tsd'
import fastify, { FastifyLoggerOptions, FastifyLogFn, LogLevels } from '../../fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'

expectType<FastifyLoggerOptions>(fastify().log)

;['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expectType<FastifyLogFn>(fastify().log[logLevel as LogLevels])
  expectType<void>(fastify().log[logLevel as LogLevels](''))
  expectType<void>(fastify().log[logLevel as LogLevels]({}))
  expectError(fastify().log[logLevel as LogLevels](0))
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
