import type { AddressInfo } from 'node:net'
import { Config as FindMyWayConfig, ConstraintStrategy } from 'find-my-way'
import { expect } from 'tstyche'
import fastify, {
  type FastifyBaseLogger,
  type FastifyBodyParser,
  type FastifyError,
  type FastifyInstance,
  type FastifyRouterOptions,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
  type RouteGenericInterface
} from '../../fastify.js'
import type { HookHandlerDoneFunction } from '../../types/hooks.js'
import type { FastifyReply } from '../../types/reply.js'
import type { FastifyRequest } from '../../types/request.js'
import type { FastifySchemaControllerOptions, FastifySchemaCompiler, FastifySerializerCompiler } from '../../types/schema.js'
import type { Bindings, ChildLoggerOptions } from '../../types/logger.js'
import type { FindMyWayVersion } from '../../types/instance.js'

const server = fastify()

expect(server.addSchema({
  type: 'null'
})).type.toBeAssignableTo<FastifyInstance>()
expect(server.addSchema({
  schemaId: 'id'
})).type.toBeAssignableTo<FastifyInstance>()
expect(server.addSchema({
  schemas: []
})).type.toBeAssignableTo<FastifyInstance>()

expect(server.pluginName).type.toBe<string>()

expect(server.getSchemas()).type.toBe<Record<string, unknown>>()
expect(server.addresses()).type.toBe<AddressInfo[]>()
expect(server.getSchema('SchemaId')).type.toBe<unknown>()
expect(server.printRoutes()).type.toBe<string>()
expect(server.printPlugins()).type.toBe<string>()
expect(server.listeningOrigin).type.toBe<string>()
expect(server.supportedMethods).type.toBe<string[]>()

expect(
  server.setErrorHandler(function (error, request, reply) {
    expect(error).type.toBe<unknown>()
    expect(this).type.toBeAssignableTo<FastifyInstance>()
  })
).type.toBeAssignableTo<FastifyInstance>()

expect(
  server.setErrorHandler<FastifyError>(function (error, request, reply) {
    expect(error).type.toBe<FastifyError>()
  })
).type.toBeAssignableTo<FastifyInstance>()

expect(
  server.setGenReqId(function (req) {
    expect(req).type.toBe<RawRequestDefaultExpression>()
    return 'foo'
  })
).type.toBeAssignableTo<FastifyInstance>()

function fastifySetGenReqId (req: RawRequestDefaultExpression) {
  return 'foo'
}
server.setGenReqId(fastifySetGenReqId)

function fastifyErrorHandler (this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(fastifyErrorHandler)

async function asyncFastifyErrorHandler (this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(asyncFastifyErrorHandler)

function nodeJSErrorHandler (error: NodeJS.ErrnoException) {
  if (error) { throw error }
}
server.setErrorHandler(nodeJSErrorHandler)

function asyncNodeJSErrorHandler (error: NodeJS.ErrnoException) {
  if (error) { throw error }
}
server.setErrorHandler(asyncNodeJSErrorHandler)

class CustomError extends Error {
  private __brand: any
}
interface ReplyPayload {
  Reply: {
    test: boolean;
  };
}
// typed sync error handler
server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  expect(reply.send).type.toBe<((...args: [payload: ReplyPayload['Reply']]) => FastifyReply<ReplyPayload, RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>>)>()
})
// typed async error handler send
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  expect(reply.send).type.toBe<((...args: [payload: ReplyPayload['Reply']]) => FastifyReply<ReplyPayload, RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>>)>()
})
// typed async error handler return
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  return { test: true }
})
// typed sync error handler send error
server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  expect(reply.send).type.not.toBeCallableWith({ test: 'foo' })
})
// typed sync error handler return error
server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  return { test: 'foo' }
})
// typed async error handler send error
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  expect(reply.send).type.not.toBeCallableWith({ test: 'foo' })
})
// typed async error handler return error
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  return { test: 'foo' }
})

function notFoundHandler (request: FastifyRequest, reply: FastifyReply) {}
async function notFoundAsyncHandler (request: FastifyRequest, reply: FastifyReply) {}
function notFoundpreHandlerHandler (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) { done() }
async function notFoundpreHandlerAsyncHandler (
  request: FastifyRequest,
  reply: FastifyReply
) {}
function notFoundpreValidationHandler (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) { done() }
async function notFoundpreValidationAsyncHandler (
  request: FastifyRequest,
  reply: FastifyReply
) {}

server.setNotFoundHandler(notFoundHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler }, notFoundHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerAsyncHandler }, notFoundHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationHandler }, notFoundHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationAsyncHandler }, notFoundHandler)
server.setNotFoundHandler(
  { preHandler: notFoundpreHandlerHandler, preValidation: notFoundpreValidationHandler },
  notFoundHandler
)

server.setNotFoundHandler(notFoundAsyncHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerAsyncHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationAsyncHandler }, notFoundAsyncHandler)
server.setNotFoundHandler(
  { preHandler: notFoundpreHandlerHandler, preValidation: notFoundpreValidationHandler },
  notFoundAsyncHandler
)

server.setNotFoundHandler(function (_, reply) {
  return reply.send('')
})

server.setSchemaController({
  bucket: (parentSchemas: unknown) => {
    return {
      add (schema: unknown) {
        expect(schema).type.toBe<unknown>()
        expect(server.addSchema({ type: 'null' })).type.toBe<FastifyInstance>()
        return server.addSchema({ type: 'null' })
      },
      getSchema (schemaId: string) {
        expect(schemaId).type.toBe<string>()
        return server.getSchema('SchemaId')
      },
      getSchemas () {
        expect(server.getSchemas()).type.toBe<Record<string, unknown>>()
        return server.getSchemas()
      }
    }
  }
})

function invalidSchemaController (schemaControllerOptions: FastifySchemaControllerOptions) {}
expect(server.setSchemaController).type.not.toBeCallableWith(invalidSchemaController)

server.setReplySerializer(function (payload, statusCode) {
  expect(payload).type.toBe<unknown>()
  expect(statusCode).type.toBe<number>()
  return 'serialized'
})

function invalidReplySerializer (payload: number, statusCode: string) {}
expect(server.setReplySerializer).type.not.toBeCallableWith(invalidReplySerializer)

function serializerWithInvalidReturn (payload: unknown, statusCode: number) {}
expect(server.setReplySerializer).type.not.toBeCallableWith(serializerWithInvalidReturn)

function invalidSchemaErrorFormatter (err: Error) {
  if (err) { throw err }
}
expect(server.setSchemaErrorFormatter).type.not.toBeCallableWith(invalidSchemaErrorFormatter)

expect(server.addHttpMethod('SEARCH', { hasBody: true })).type.toBe<FastifyInstance>()

// test listen opts objects
expect(server.listen()).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000 })).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } })).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0' })).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 })).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true })).type.toBeAssignableTo<PromiseLike<string>>()
expect(server.listen({ port: 3000, host: '::/0', ipv6Only: true })).type.toBeAssignableTo<PromiseLike<string>>()

expect(server.listen(() => {})).type.toBe<void>()
expect(server.listen({ port: 3000 }, () => {})).type.toBe<void>()
expect(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } }, () => {})).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0' }, () => {})).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => {})).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }, () => {})).type.toBe<void>()
expect(server.listen({ port: 3000, host: '::/0', ipv6Only: true }, () => {})).type.toBe<void>()

// test after method
expect(server.after()).type.toBeAssignableTo<FastifyInstance>()
expect(server.after((err) => {
  expect(err).type.toBe<Error | null>()
})).type.toBeAssignableTo<FastifyInstance>()

// test ready method
expect(server.ready()).type.toBeAssignableTo<FastifyInstance>()
expect(server.ready((err) => {
  expect(err).type.toBe<Error | null>()
})).type.toBeAssignableTo<FastifyInstance>()
expect(server.ready(async (err) => {
  expect(err).type.toBe<Error | null>()
})).type.toBeAssignableTo<FastifyInstance>()

expect(server.routing({} as RawRequestDefaultExpression, {} as RawReplyDefaultExpression)).type.toBe<void>()

expect(fastify().get<RouteGenericInterface, { contextKey: string }>('/', {
  handler: () => {},
  errorHandler: (error, request, reply) => {
    expect(error).type.toBe<FastifyError>()
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(request.routeOptions.config).type.toBeAssignableTo<{ contextKey: string }>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(server.errorHandler(error, request, reply)).type.toBe<void>()
  }
})).type.toBe<FastifyInstance>()

expect(fastify().get('/', {
  handler: () => {},
  childLoggerFactory: (logger, bindings, opts, req) => {
    expect(server.childLoggerFactory(logger, bindings, opts, req)).type.toBe<FastifyBaseLogger>()
    return server.childLoggerFactory(logger, bindings, opts, req)
  }
})).type.toBe<FastifyInstance>()

expect(
  server.setChildLoggerFactory(function (logger, bindings, opts, req) {
    expect(logger).type.toBe<FastifyBaseLogger>()
    expect(bindings).type.toBe<Bindings>()
    expect(opts).type.toBe<ChildLoggerOptions>()
    expect(req).type.toBe<RawRequestDefaultExpression>()
    expect(this).type.toBe<FastifyInstance>()
    return logger.child(bindings, opts)
  })
).type.toBe<FastifyInstance>()

expect(
  server.setErrorHandler<FastifyError>(function (error, request, reply) {
    expect(error).type.toBe<FastifyError>()
  })
).type.toBe<FastifyInstance>()

function childLoggerFactory (
  this: FastifyInstance,
  logger: FastifyBaseLogger,
  bindings: Bindings,
  opts: ChildLoggerOptions,
  req: RawRequestDefaultExpression
) {
  return logger.child(bindings, opts)
}
server.setChildLoggerFactory(childLoggerFactory)
server.setChildLoggerFactory(server.childLoggerFactory)

type InitialConfig = Readonly<{
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  bodyLimit?: number,
  caseSensitive?: boolean,
  allowUnsafeRegex?: boolean,
  forceCloseConnections?: boolean,
  http2?: boolean,
  https?: boolean | Readonly<{ allowHTTP1: boolean }>,
  ignoreTrailingSlash?: boolean,
  ignoreDuplicateSlashes?: boolean,
  disableRequestLogging?: boolean | ((req: FastifyRequest) => boolean),
  maxParamLength?: number,
  onProtoPoisoning?: 'error' | 'remove' | 'ignore',
  onConstructorPoisoning?: 'error' | 'remove' | 'ignore',
  pluginTimeout?: number,
  requestIdHeader?: string | false,
  requestIdLogLabel?: string,
  http2SessionTimeout?: number,
  useSemicolonDelimiter?: boolean,
  routerOptions?: FastifyRouterOptions<RawServerDefault>
}>

expect(fastify().initialConfig).type.toBe<InitialConfig>()

expect<FastifyRouterOptions<RawServerDefault>>().type.toBeAssignableTo<
  FindMyWayConfig<FindMyWayVersion<RawServerDefault>>
>()

fastify({
  routerOptions: {
    defaultRoute: (req, res) => {
      expect(req).type.toBe<RawRequestDefaultExpression<RawServerDefault>>()
      expect(res).type.toBe<RawReplyDefaultExpression<RawServerDefault>>()
      expect(res).type.not.toBeAssignableFrom<FastifyReply>()
      res.end('foo')
    },
    onBadUrl: (path, req, res) => {
      expect(path).type.toBe<string>()
      expect(req).type.toBe<RawRequestDefaultExpression<RawServerDefault>>()
      expect(res).type.toBe<RawReplyDefaultExpression<RawServerDefault>>()
      expect(res).type.not.toBeAssignableFrom<FastifyReply>()
      res.end('foo')
    }
  }
})

expect(server.defaultTextParser).type.toBe<FastifyBodyParser<string>>()

expect(server.getDefaultJsonParser('ignore', 'error')).type.toBe<FastifyBodyParser<string>>()

expect(server.printRoutes({ includeHooks: true, commonPrefix: false, includeMeta: true })).type.toBe<string>()

expect(server.printRoutes({ includeMeta: ['key1', Symbol('key2')] })).type.toBe<string>()

expect(server.printRoutes({ method: 'GET' })).type.toBe<string>()

expect(server.printRoutes()).type.toBe<string>()

server.decorate<(x: string) => void>('test', function (x: string): void {
  expect(this).type.toBe<FastifyInstance>()
})
server.decorate('test', function (x: string): void {
  expect(this).type.toBe<FastifyInstance>()
})
server.decorate<string>('test', {
  getter () {
    expect(this).type.toBe<FastifyInstance>()
    return 'foo'
  }
})
server.decorate<string>('test', {
  getter () {
    expect(this).type.toBe<FastifyInstance>()
    return 'foo'
  },
  setter (x) {
    expect(x).type.toBe<string>()
    expect(this).type.toBe<FastifyInstance>()
  }
})
server.decorate('test')
server.decorate('test', null, ['foo'])

server.decorateRequest<(x: string, y: number) => void>('test', function (x: string, y: number): void {
  expect(this).type.toBe<FastifyRequest>()
})
server.decorateRequest('test', function (x: string, y: number): void {
  expect(this).type.toBe<FastifyRequest>()
})
server.decorateRequest('test')
server.decorateRequest('test', null, ['foo'])

server.decorateReply<(x: string) => void>('test', function (x: string): void {
  expect(this).type.toBe<FastifyReply>()
})
server.decorateReply('test', function (x: string): void {
  expect(this).type.toBe<FastifyReply>()
})
server.decorateReply('test')
server.decorateReply('test', null, ['foo'])

expect(server.decorate<string>).type.not.toBeCallableWith('test', true)
expect(server.decorate<(myNumber: number) => number>).type.not.toBeCallableWith('test', function (myNumber: number): string {
  return ''
})
expect(server.decorate<string>).type.not.toBeCallableWith('test', {
  getter () {
    return true
  }
})
expect(server.decorate<string>).type.not.toBeCallableWith('test', {
  setter () {}
})

declare module '../../fastify.js' {
  interface FastifyInstance {
    typedTestProperty: boolean
    typedTestPropertyGetterSetter: string
    typedTestMethod (x: string): string
  }

  interface FastifyRequest {
    typedTestRequestProperty: boolean
    typedTestRequestPropertyGetterSetter: string
    typedTestRequestMethod (x: string): string
  }

  interface FastifyReply {
    typedTestReplyProperty: boolean
    typedTestReplyPropertyGetterSetter: string
    typedTestReplyMethod (x: string): string
  }
}

server.decorate('typedTestProperty', false)
server.decorate('typedTestProperty', {
  getter () {
    return false
  }
})
server.decorate('typedTestProperty', {
  getter (): boolean {
    return true
  },
  setter (x) {
    expect(x).type.toBe<boolean>()
    expect(this).type.toBe<FastifyInstance>()
  }
})
server.decorate('typedTestProperty')
server.decorate('typedTestProperty', null, ['foo'])
expect(server.decorate).type.not.toBeCallableWith('typedTestProperty', null)
expect(server.decorate).type.not.toBeCallableWith('typedTestProperty', 'foo')
expect(server.decorate).type.not.toBeCallableWith('typedTestProperty', {
  getter () {
    return 'foo'
  }
})
server.decorate('typedTestMethod', function (x) {
  expect(x).type.toBe<string>()
  expect(this).type.toBe<FastifyInstance>()
  return 'foo'
})
server.decorate('typedTestMethod', x => x)
expect(server.decorate).type.not.toBeCallableWith('typedTestMethod', function (x: boolean) {
  return 'foo'
})
expect(server.decorate).type.not.toBeCallableWith('typedTestMethod', function () {
  return true
})
expect(server.decorate).type.not.toBeCallableWith('typedTestMethod', async function () {
  return 'foo'
})

server.decorateRequest('typedTestRequestProperty', false)
server.decorateRequest('typedTestRequestProperty', {
  getter () {
    return false
  }
})
server.decorateRequest('typedTestRequestProperty', {
  getter (): boolean {
    return true
  },
  setter (x) {
    expect(x).type.toBe<boolean>()
    expect(this).type.toBe<FastifyRequest>()
  }
})
server.decorateRequest('typedTestRequestProperty')
server.decorateRequest('typedTestRequestProperty', null, ['foo'])
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestProperty', null)
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestProperty', 'foo')
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestProperty', {
  getter () {
    return 'foo'
  }
})
server.decorateRequest('typedTestRequestMethod', function (x) {
  expect(x).type.toBe<string>()
  expect(this).type.toBe<FastifyRequest>()
  return 'foo'
})
server.decorateRequest('typedTestRequestMethod', x => x)
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestMethod', function (x: boolean) {
  return 'foo'
})
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestMethod', function () {
  return true
})
expect(server.decorateRequest).type.not.toBeCallableWith('typedTestRequestMethod', async function () {
  return 'foo'
})

server.decorateReply('typedTestReplyProperty', false)
server.decorateReply('typedTestReplyProperty', {
  getter () {
    return false
  }
})
server.decorateReply('typedTestReplyProperty', {
  getter (): boolean {
    return true
  },
  setter (x) {
    expect(x).type.toBe<boolean>()
    expect(this).type.toBe<FastifyReply>()
  }
})
server.decorateReply('typedTestReplyProperty')
server.decorateReply('typedTestReplyProperty', null, ['foo'])
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyProperty', null)
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyProperty', 'foo')
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyProperty', {
  getter () {
    return 'foo'
  }
})
server.decorateReply('typedTestReplyMethod', function (x) {
  expect(x).type.toBe<string>()
  expect(this).type.toBe<FastifyReply>()
  return 'foo'
})
server.decorateReply('typedTestReplyMethod', x => x)
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyMethod', function (x: boolean) {
  return 'foo'
})
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyMethod', function () {
  return true
})
expect(server.decorateReply).type.not.toBeCallableWith('typedTestReplyMethod', async function () {
  return 'foo'
})

expect(server.getDecorator<string>('foo')).type.toBe<string>()

const versionConstraintStrategy: ConstraintStrategy<FindMyWayVersion<RawServerDefault>> = {
  name: 'version',
  storage: () => ({
    get: () => () => {},
    set: () => { },
    del: () => { },
    empty: () => { }
  }),
  validate () {},
  deriveConstraint: () => 'foo'
}
expect(server.addConstraintStrategy(versionConstraintStrategy)).type.toBe<void>()
expect(server.hasConstraintStrategy(versionConstraintStrategy.name)).type.toBe<boolean>()

expect(server.validatorCompiler).type.toBe<FastifySchemaCompiler<any> | undefined>()
expect(server.serializerCompiler).type.toBe<FastifySerializerCompiler<any> | undefined>()
