import { expectError, expectType } from 'tsd'
import fastify, { FastifyLogFn, LogLevel, FastifyLoggerInstance, FastifyError, FastifyRequest, FastifyReply } from '../../fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import pino from 'pino'
import * as fs from 'fs'

expectType<FastifyLoggerInstance>(fastify().log)

class Foo {}

['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expectType<FastifyLogFn>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel])
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](''))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel]({}))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel]({ foo: 'bar' }))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](new Error()))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](new Foo()))
  expectType<void>(fastify<Server, IncomingMessage, ServerResponse, FastifyLoggerInstance>().log[logLevel as LogLevel](0))
})

interface CustomLogger extends FastifyLoggerInstance {
  customMethod(msg: string, ...args: unknown[]): void;
}

class CustomLoggerImpl implements CustomLogger {
  customMethod (msg: string, ...args: unknown[]) { console.log(msg, args) }

  // Implementation signature must be compatible with all overloads of FastifyLogFn
  info (arg1: unknown, arg2?: unknown, ...args: unknown[]): void {
    console.log(arg1, arg2, ...args)
  }

  warn (...args: unknown[]) { console.log(args) }
  error (...args: unknown[]) { console.log(args) }
  fatal (...args: unknown[]) { console.log(args) }
  trace (...args: unknown[]) { console.log(args) }
  debug (...args: unknown[]) { console.log(args) }
  child () { return new CustomLoggerImpl() }
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

const serverWithFileOption = fastify<
Server,
IncomingMessage,
ServerResponse
>({
  logger: {
    level: 'info',
    file: '/path/to/file'
  }
})

expectType<FastifyLoggerInstance>(serverWithFileOption.log)

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

const serverAutoInferredFileOption = fastify({
  logger: {
    level: 'info',
    file: '/path/to/file'
  }
})

expectType<FastifyLoggerInstance>(serverAutoInferredFileOption.log)

const serverAutoInferredPinoPrettyBooleanOption = fastify({
  logger: {
    prettyPrint: true
  }
})

expectType<FastifyLoggerInstance>(serverAutoInferredPinoPrettyBooleanOption.log)

const serverAutoInferredPinoPrettyObjectOption = fastify({
  logger: {
    prettyPrint: {
      translateTime: true,
      levelFirst: false,
      messageKey: 'msg',
      timestampKey: 'time',
      messageFormat: false,
      colorize: true,
      crlf: false,
      errorLikeObjectKeys: ['err', 'error'],
      errorProps: '',
      search: 'foo == `bar`',
      ignore: 'pid,hostname',
      suppressFlushSyncWarning: true
    }
  }
})

expectType<FastifyLoggerInstance>(serverAutoInferredPinoPrettyObjectOption.log)

const serverAutoInferredSerializerObjectOption = fastify({
  logger: {
    serializers: {
      req (IncomingMessage) {
        expectType<FastifyRequest>(IncomingMessage)
        return {
          method: 'method',
          url: 'url',
          version: 'version',
          hostname: 'hostname',
          remoteAddress: 'remoteAddress',
          remotePort: 80,
          other: ''
        }
      },
      res (ServerResponse) {
        expectType<FastifyReply>(ServerResponse)
        return {
          statusCode: 'statusCode'
        }
      },
      err (FastifyError) {
        return {
          other: '',
          type: 'type',
          message: 'msg',
          stack: 'stack'
        }
      }
    }
  }
})

expectType<FastifyLoggerInstance>(serverAutoInferredSerializerObjectOption.log)

const passStreamAsOption = fastify({
  logger: {
    stream: fs.createWriteStream('/tmp/stream.out')
  }
})

const childParent = fastify().log
// we test different option variant here
expectType<FastifyLoggerInstance>(childParent.child({}, { level: 'info' }))
expectType<FastifyLoggerInstance>(childParent.child({}, { redact: ['pass', 'pin'] }))
expectType<FastifyLoggerInstance>(childParent.child({}, { serializers: { key: () => {} } }))
expectType<FastifyLoggerInstance>(childParent.child({}, { level: 'info', redact: ['pass', 'pin'], serializers: { key: () => {} } }))

// no option pass
expectError(childParent.child())
// wrong option
expectError(childParent.child({}, { nonExist: true }))
