import type { Server, IncomingMessage, ServerResponse } from 'node:http'
import * as fs from 'node:fs'
import P from 'pino'
import { expect } from 'tstyche'
import fastify, {
  type FastifyLogFn,
  type FastifyBaseLogger,
  type FastifyRequest,
  type FastifyReply,
  type LogLevel
} from '../../fastify.js'
import type { ResSerializerReply } from '../../types/logger.js'

expect(fastify().log).type.toBe<FastifyBaseLogger>()

class Foo {}

['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(logLevel => {
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel]
  ).type.toBe<FastifyLogFn>()
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel]('')
  ).type.toBe<void>()
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel]({})
  ).type.toBe<void>()
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel]({ foo: 'bar' })
  ).type.toBe<void>()
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel](new Error())
  ).type.toBe<void>()
  expect(
    fastify<Server, IncomingMessage, ServerResponse, FastifyBaseLogger>().log[logLevel as LogLevel](new Foo())
  ).type.toBe<void>()
})

interface CustomLogger extends FastifyBaseLogger {
  customMethod(msg: string, ...args: unknown[]): void;
}

class CustomLoggerImpl implements CustomLogger {
  level = 'info'
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
  silent (...args: unknown[]) { }

  child (bindings: P.Bindings, options?: P.ChildLoggerOptions): CustomLoggerImpl { return new CustomLoggerImpl() }
}

const customLogger = new CustomLoggerImpl()

const serverWithCustomLogger = fastify<
Server,
IncomingMessage,
ServerResponse,
CustomLoggerImpl
>({ logger: customLogger })

expect(serverWithCustomLogger.log).type.toBe<CustomLoggerImpl>()

const serverWithPino = fastify<
  Server,
  IncomingMessage,
  ServerResponse,
  P.Logger
>({
  logger: P({
    level: 'info',
    redact: ['x-userinfo']
  })
})

expect(serverWithPino.log).type.toBe<P.Logger>()

serverWithPino.route({
  method: 'GET',
  url: '/',
  handler (request) {
    expect(this.log).type.toBe<P.Logger>()
    expect(request.log).type.toBe<P.Logger>()
  }
})

serverWithPino.get('/', function (request) {
  expect(this.log).type.toBe<P.Logger>()
  expect(request.log).type.toBe<P.Logger>()
})

const serverWithLogOptions = fastify<
  Server,
  IncomingMessage,
  ServerResponse
>({
  logger: {
    level: 'info'
  }
})

expect(serverWithLogOptions.log).type.toBe<FastifyBaseLogger>()

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

expect(serverWithFileOption.log).type.toBe<FastifyBaseLogger>()

const serverAutoInferringTypes = fastify({
  logger: {
    level: 'info'
  }
})

expect(serverAutoInferringTypes.log).type.toBe<FastifyBaseLogger>()

const serverWithLoggerInstance = fastify({
  loggerInstance: P({
    level: 'info',
    redact: ['x-userinfo']
  })
})

expect(serverWithLoggerInstance.log).type.toBe<P.Logger>()

const serverWithPinoConfig = fastify({
  logger: {
    level: 'info',
    serializers: {
      req (IncomingMessage) {
        expect(IncomingMessage).type.toBe<FastifyRequest>()
        return {
          method: 'method',
          url: 'url',
          version: 'version',
          host: 'hostname',
          remoteAddress: 'remoteAddress',
          remotePort: 80,
          other: ''
        }
      },
      res (ServerResponse) {
        expect(ServerResponse).type.toBe<ResSerializerReply<Server, FastifyReply>>()
        expect(ServerResponse).type.toBeAssignableTo<Partial<FastifyReply> & Pick<FastifyReply, 'statusCode'>>()
        expect(ServerResponse).type.not.toBeAssignableTo<FastifyReply>()
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

expect(serverWithPinoConfig.log).type.toBe<FastifyBaseLogger>()

const serverAutoInferredFileOption = fastify({
  logger: {
    level: 'info',
    file: '/path/to/file'
  }
})

expect(serverAutoInferredFileOption.log).type.toBe<FastifyBaseLogger>()

const serverAutoInferredSerializerResponseObjectOption = fastify({
  logger: {
    serializers: {
      res (ServerResponse) {
        expect(ServerResponse).type.toBe<ResSerializerReply<Server, FastifyReply>>()
        expect(ServerResponse).type.toBeAssignableTo<Partial<FastifyReply> & Pick<FastifyReply, 'statusCode'>>()
        expect(ServerResponse).type.not.toBeAssignableTo<FastifyReply>()
        return {
          status: '200'
        }
      }
    }
  }
})

expect(serverAutoInferredSerializerResponseObjectOption.log).type.toBe<FastifyBaseLogger>()

const serverAutoInferredSerializerObjectOption = fastify({
  logger: {
    serializers: {
      req (IncomingMessage) {
        expect(IncomingMessage).type.toBe<FastifyRequest>()
        return {
          method: 'method',
          url: 'url',
          version: 'version',
          host: 'hostname',
          remoteAddress: 'remoteAddress',
          remotePort: 80,
          other: ''
        }
      },
      res (ServerResponse) {
        expect(ServerResponse).type.toBe<ResSerializerReply<Server, FastifyReply>>()
        expect(ServerResponse).type.toBeAssignableTo<Partial<FastifyReply> & Pick<FastifyReply, 'statusCode'>>()
        expect(ServerResponse).type.not.toBeAssignableTo<FastifyReply>()
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

expect(serverAutoInferredSerializerObjectOption.log).type.toBe<FastifyBaseLogger>()

const passStreamAsOption = fastify({
  logger: {
    stream: fs.createWriteStream('/tmp/stream.out')
  }
})

expect(passStreamAsOption.log).type.toBe<FastifyBaseLogger>()

const passPinoOption = fastify({
  logger: {
    redact: ['custom'],
    messageKey: 'msg',
    nestedKey: 'nested',
    enabled: true
  }
})

expect(passPinoOption.log).type.toBe<FastifyBaseLogger>()

const childParent = fastify().log
// we test different option variant here
expect(childParent.child({}, { level: 'info' })).type.toBe<FastifyBaseLogger>()
expect(childParent.child({}, { level: 'silent' })).type.toBe<FastifyBaseLogger>()
expect(childParent.child({}, { redact: ['pass', 'pin'] })).type.toBe<FastifyBaseLogger>()
expect(childParent.child({}, { serializers: { key: () => {} } })).type.toBe<FastifyBaseLogger>()
expect(childParent.child({}, { level: 'info', redact: ['pass', 'pin'], serializers: { key: () => {} } })).type.toBe<FastifyBaseLogger>()

// no option pass
expect(childParent.child).type.not.toBeCallableWith()
// wrong option
expect(childParent.child).type.not.toBeCallableWith({}, { nonExist: true })
