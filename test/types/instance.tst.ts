import { AddressInfo } from 'node:net'
import { ConstraintStrategy, Config as FindMyWayConfig } from 'find-my-way'
import { expect } from 'tstyche'
import fastify, {
  FastifyBaseLogger,
  FastifyBodyParser,
  FastifyError,
  FastifyInstance,
  FastifyListenOptions,
  FastifyRouterOptions,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface
} from '../../fastify.js'
import { HookHandlerDoneFunction } from '../../types/hooks.js'
import { FindMyWayVersion } from '../../types/instance.js'
import { Bindings, ChildLoggerOptions } from '../../types/logger.js'
import { FastifyReply } from '../../types/reply.js'
import { FastifyRequest } from '../../types/request.js'
import { FastifySchemaCompiler, FastifySchemaControllerOptions, FastifySerializerCompiler } from '../../types/schema.js'

const server = fastify()

expect(server.addSchema({ type: 'null' })).type.toBe<FastifyInstance>()
expect(server.addSchema({ schemaId: 'id' })).type.toBe<FastifyInstance>()
expect(server.addSchema({ schemas: [] })).type.toBe<FastifyInstance>()

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
    expect(this).type.toBe<FastifyInstance>()
  })
).type.toBe<FastifyInstance>()

expect(
  server.setErrorHandler<FastifyError>(function (error, request, reply) {
    expect(error).type.toBe<FastifyError>()
  })
).type.toBe<FastifyInstance>()

expect(
  server.setGenReqId(function (req) {
    expect(req).type.toBe<RawRequestDefaultExpression>()
    return 'foo'
  })
).type.toBe<FastifyInstance>()

function fastifySetGenReqId (req: RawRequestDefaultExpression) {
  return 'foo'
}
server.setGenReqId(fastifySetGenReqId)

function fastifyErrorHandler (this: FastifyInstance, error: FastifyError) { }
server.setErrorHandler(fastifyErrorHandler)

async function asyncFastifyErrorHandler (this: FastifyInstance, error: FastifyError) { }
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
  // @ts-expect-error  Type 'string' is not assignable to type 'boolean'.
  reply.send({ test: 'foo' })
})
// typed sync error handler return error
server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  return { test: 'foo' }
})
// typed async error handler send error
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  // @ts-expect-error  Type 'string' is not assignable to type 'boolean'.
  reply.send({ test: 'foo' })
})
// typed async error handler return error
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expect(error).type.toBe<CustomError>()
  return { test: 'foo' }
})

function notFoundHandler (request: FastifyRequest, reply: FastifyReply) { }
async function notFoundAsyncHandler (request: FastifyRequest, reply: FastifyReply) { }
function notFoundpreHandlerHandler (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) { done() }
async function notFoundpreHandlerAsyncHandler (
  request: FastifyRequest,
  reply: FastifyReply
) { }
function notFoundpreValidationHandler (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
) { done() }
async function notFoundpreValidationAsyncHandler (
  request: FastifyRequest,
  reply: FastifyReply
) { }

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
  bucket: (parentSchemas) => {
    expect(parentSchemas).type.toBe<unknown>()

    return {
      add (schema) {
        expect(schema).type.toBe<unknown>()
        expect(server.addSchema({ type: 'null' })).type.toBe<FastifyInstance>()
        return server.addSchema({ type: 'null' })
      },
      getSchema (schemaId) {
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

function invalidSchemaController (schemaControllerOptions: FastifySchemaControllerOptions) { }
// @ts-expect-error  Type '(schemaControllerOptions: FastifySchemaControllerOptions) => void' has no properties in common with type 'FastifySchemaControllerOptions'.
server.setSchemaController(invalidSchemaController)

server.setReplySerializer(function (payload, statusCode) {
  expect(payload).type.toBe<unknown>()
  expect(statusCode).type.toBe<number>()
  return 'serialized'
})

function invalidReplySerializer (payload: number, statusCode: string) { }
// @ts-expect-error  Argument of type '(payload: number, statusCode: string) => void' is not assignable to parameter of type '(payload: unknown, statusCode: number) => string'.
server.setReplySerializer(invalidReplySerializer)

function serializerWithInvalidReturn (payload: unknown, statusCode: number) { }
// @ts-expect-error  Argument of type '(payload: unknown, statusCode: number) => void' is not assignable to parameter of type '(payload: unknown, statusCode: number) => string'.
server.setReplySerializer(serializerWithInvalidReturn)

function invalidSchemaErrorFormatter (err: Error) {
  if (err) { throw err }
}
// @ts-expect-error  Argument of type '(err: Error) => void' is not assignable to parameter of type 'SchemaErrorFormatter'.
server.setSchemaErrorFormatter(invalidSchemaErrorFormatter)

expect(server.addHttpMethod('SEARCH', { hasBody: true })).type.toBe<FastifyInstance>()

// test listen opts objects
const options: FastifyListenOptions = {}

expect(server.listen()).type.toBe<Promise<string>>()
expect(server.listen(options)).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000 })).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } })).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0' })).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 })).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true })).type.toBe<Promise<string>>()
expect(server.listen({ port: 3000, host: '::/0', ipv6Only: true })).type.toBe<Promise<string>>()

expect(server.listen(() => { })).type.toBe<void>()
expect(server.listen({ port: 3000 }, () => { })).type.toBe<void>()
expect(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } }, () => { })).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0' }, () => { })).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => { })).type.toBe<void>()
expect(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }, () => { })).type.toBe<void>()
expect(server.listen({ port: 3000, host: '::/0', ipv6Only: true }, () => { })).type.toBe<void>()

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
  handler: () => { },
  errorHandler: (error, request, reply) => {
    expect(error).type.toBe<FastifyError>()
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(request.routeOptions.config).type.toBeAssignableTo<{ contextKey: string }>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(server.errorHandler(error, request, reply)).type.toBe<void>()
  }
})).type.toBe<FastifyInstance>()

expect(fastify().get('/', {
  handler: () => { },
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
      expect(res).type.not.toBeAssignableTo<FastifyReply>()
      res.end('foo')
    },
    onBadUrl: (path, req, res) => {
      expect(path).type.toBe<string>()
      expect(req).type.toBe<RawRequestDefaultExpression<RawServerDefault>>()
      expect(res).type.toBe<RawReplyDefaultExpression<RawServerDefault>>()
      expect(res).type.not.toBeAssignableTo<FastifyReply>()
      res.end('foo')
    },
    onMaxParamLength (path, req, res) {
      expect(path).type.toBe<string>()
      expect(req).type.toBe<RawRequestDefaultExpression<RawServerDefault>>()
      expect(res).type.toBe<RawReplyDefaultExpression<RawServerDefault>>()
      expect(res).type.not.toBeAssignableTo<FastifyReply>()
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

// @ts-expect-error  Argument of type 'boolean' is not assignable to parameter of type 'GetterSetter...'.
server.decorate<string>('test', true)
// @ts-expect-error  Type 'string' is not assignable to type 'number'.
server.decorate<(myNumber: number) => number>('test', function (myNumber: number): string {
  return ''
})
server.decorate<string>('test', {
  // @ts-expect-error  Type 'boolean' is not assignable to type 'string'.
  getter () {
    return true
  }
})
// @ts-expect-error  Property 'getter' is missing in type
server.decorate<string>('test', {
  setter (x) { }
})

declare module '../../fastify' {
  interface FastifyInstance {
    typedTestProperty: boolean
    typedTestPropertyGetterSetter: string
    typedTestMethod(x: string): string
  }

  interface FastifyRequest {
    typedTestRequestProperty: boolean
    typedTestRequestPropertyGetterSetter: string
    typedTestRequestMethod(x: string): string
  }

  interface FastifyReply {
    typedTestReplyProperty: boolean
    typedTestReplyPropertyGetterSetter: string
    typedTestReplyMethod(x: string): string
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
// @ts-expect-error  Type 'string' is not assignable to type 'boolean'.
server.decorate('typedTestMethod', function (x: boolean) {
  return 'foo'
})
// @ts-expect-error  Type 'boolean' is not assignable to type 'string'.
server.decorate('typedTestMethod', function () {
  return true
})
// @ts-expect-error  Type 'Promise<string>' is not assignable to type 'string'.
server.decorate('typedTestMethod', async function () {
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
// @ts-expect-error  Type 'string' is not assignable to type 'boolean'.
server.decorateRequest('typedTestRequestMethod', function (x: boolean) {
  return 'foo'
})
// @ts-expect-error  Type 'boolean' is not assignable to type 'string'.
server.decorateRequest('typedTestRequestMethod', function () {
  return true
})
// @ts-expect-error  Type 'Promise<string>' is not assignable to type 'string'.
server.decorateRequest('typedTestRequestMethod', async function () {
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
// @ts-expect-error  Type 'string' is not assignable to type 'boolean'
server.decorateReply('typedTestReplyMethod', function (x: boolean) {
  return 'foo'
})
// @ts-expect-error  Type 'boolean' is not assignable to type 'string'
server.decorateReply('typedTestReplyMethod', function (x) {
  return true
})
// @ts-expect-error  Type 'Promise<string>' is not assignable to type 'string'.
server.decorateReply('typedTestReplyMethod', async function () {
  return 'foo'
})

const foo = server.getDecorator<string>('foo')
expect(foo).type.toBe<string>()

const versionConstraintStrategy: ConstraintStrategy<FindMyWayVersion<RawServerDefault>> = {
  name: 'version',
  storage: () => ({
    get: () => () => { },
    set: () => { },
    del: () => { },
    empty: () => { }
  }),
  validate () { },
  deriveConstraint: () => 'foo'
}
expect(server.addConstraintStrategy(versionConstraintStrategy)).type.toBe<void>()
expect(server.hasConstraintStrategy(versionConstraintStrategy.name)).type.toBe<boolean>()

expect(server.validatorCompiler).type.toBe<FastifySchemaCompiler<any> | undefined>()
expect(server.serializerCompiler).type.toBe<FastifySerializerCompiler<any> | undefined>()
