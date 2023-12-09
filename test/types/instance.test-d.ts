import { expectAssignable, expectDeprecated, expectError, expectNotDeprecated, expectType } from 'tsd'
import fastify, {
  FastifyBaseLogger,
  FastifyBodyParser,
  FastifyError,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
  RouteGenericInterface
} from '../../fastify'
import { HookHandlerDoneFunction } from '../../types/hooks'
import { FastifyReply } from '../../types/reply'
import { FastifyRequest } from '../../types/request'
import { DefaultRoute } from '../../types/route'
import { FastifySchemaControllerOptions, FastifySchemaCompiler, FastifySerializerCompiler } from '../../types/schema'
import { AddressInfo } from 'net'
import { Bindings, ChildLoggerOptions } from '../../types/logger'

const server = fastify()

expectAssignable<FastifyInstance>(server.addSchema({
  type: 'null'
}))
expectAssignable<FastifyInstance>(server.addSchema({
  schemaId: 'id'
}))
expectAssignable<FastifyInstance>(server.addSchema({
  schemas: []
}))

expectType<string>(server.pluginName)

expectType<Record<string, unknown>>(server.getSchemas())
expectType<AddressInfo[]>(server.addresses())
expectType<unknown>(server.getSchema('SchemaId'))
expectType<string>(server.printRoutes())
expectType<string>(server.printPlugins())
expectType<string>(server.listeningOrigin)

expectAssignable<FastifyInstance>(
  server.setErrorHandler(function (error, request, reply) {
    expectType<FastifyError>(error)
    expectAssignable<FastifyInstance>(this)
  })
)

expectAssignable<FastifyInstance>(
  server.setErrorHandler<FastifyError>(function (error, request, reply) {
    expectType<FastifyError>(error)
  })
)

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
  expectType<CustomError>(error)
  expectType<((payload?: ReplyPayload['Reply']) => FastifyReply<RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>, ReplyPayload>)>(reply.send)
})
// typed async error handler send
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expectType<CustomError>(error)
  expectType<((payload?: ReplyPayload['Reply']) => FastifyReply<RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>, ReplyPayload>)>(reply.send)
})
// typed async error handler return
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expectType<CustomError>(error)
  return { test: true }
})
// typed sync error handler send error
expectError(server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expectType<CustomError>(error)
  reply.send({ test: 'foo' })
}))
// typed sync error handler return error
server.setErrorHandler<CustomError, ReplyPayload>((error, request, reply) => {
  expectType<CustomError>(error)
  return { test: 'foo' }
})
// typed async error handler send error
expectError(server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expectType<CustomError>(error)
  reply.send({ test: 'foo' })
}))
// typed async error handler return error
server.setErrorHandler<CustomError, ReplyPayload>(async (error, request, reply) => {
  expectType<CustomError>(error)
  return { test: 'foo' }
})

function notFoundHandler (request: FastifyRequest, reply: FastifyReply) {}
async function notFoundAsyncHandler (request: FastifyRequest, reply: FastifyReply) {}
function notFoundpreHandlerHandler (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) { done() }
async function notFoundpreHandlerAsyncHandler (request: FastifyRequest, reply: FastifyReply) {}
function notFoundpreValidationHandler (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) { done() }
async function notFoundpreValidationAsyncHandler (request: FastifyRequest, reply: FastifyReply) {}

server.setNotFoundHandler(notFoundHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler }, notFoundHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerAsyncHandler }, notFoundHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationHandler }, notFoundHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationAsyncHandler }, notFoundHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler, preValidation: notFoundpreValidationHandler }, notFoundHandler)

server.setNotFoundHandler(notFoundAsyncHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerAsyncHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preValidation: notFoundpreValidationAsyncHandler }, notFoundAsyncHandler)
server.setNotFoundHandler({ preHandler: notFoundpreHandlerHandler, preValidation: notFoundpreValidationHandler }, notFoundAsyncHandler)

server.setNotFoundHandler(function (_, reply) {
  return reply.send('')
})

function invalidErrorHandler (error: number) {
  if (error) throw error
}

expectError(server.setErrorHandler(invalidErrorHandler))

server.setSchemaController({
  bucket: (parentSchemas: unknown) => {
    return {
      add (schema: unknown) {
        expectType<unknown>(schema)
        expectType<FastifyInstance>(server.addSchema({ type: 'null' }))
        return server.addSchema({ type: 'null' })
      },
      getSchema (schemaId: string) {
        expectType<string>(schemaId)
        return server.getSchema('SchemaId')
      },
      getSchemas () {
        expectType<Record<string, unknown>>(server.getSchemas())
        return server.getSchemas()
      }
    }
  }
})

function invalidSchemaController (schemaControllerOptions: FastifySchemaControllerOptions) {}
expectError(server.setSchemaController(invalidSchemaController))

server.setReplySerializer(function (payload, statusCode) {
  expectType<unknown>(payload)
  expectType<number>(statusCode)
  return 'serialized'
})

function invalidReplySerializer (payload: number, statusCode: string) {}
expectError(server.setReplySerializer(invalidReplySerializer))

function serializerWithInvalidReturn (payload: unknown, statusCode: number) {}
expectError(server.setReplySerializer(serializerWithInvalidReturn))

function invalidSchemaErrorFormatter (err: Error) {
  if (err) { throw err }
}
expectError(server.setSchemaErrorFormatter(invalidSchemaErrorFormatter))

// test listen method callback
expectAssignable<void>(server.listen(3000, '', 0, (err, address) => {
  expectType<Error | null>(err)
}))
expectAssignable<void>(server.listen('3000', '', 0, (err, address) => {
  expectType<Error | null>(err)
}))
expectAssignable<void>(server.listen(3000, '', (err, address) => {
  expectType<Error | null>(err)
}))
expectAssignable<void>(server.listen('3000', '', (err, address) => {
  expectType<Error | null>(err)
}))
expectAssignable<void>(server.listen(3000, (err, address) => {
  expectType<Error | null>(err)
}))
expectAssignable<void>(server.listen('3000', (err, address) => {
  expectType<Error | null>(err)
}))

// test listen method callback types
expectAssignable<void>(server.listen('3000', (err, address) => {
  expectAssignable<Error|null>(err)
  expectAssignable<string>(address)
}))

// test listen method promise
expectAssignable<PromiseLike<string>>(server.listen(3000))
expectAssignable<PromiseLike<string>>(server.listen('3000'))
expectAssignable<PromiseLike<string>>(server.listen(3000, '', 0))
expectAssignable<PromiseLike<string>>(server.listen('3000', '', 0))
expectAssignable<PromiseLike<string>>(server.listen(3000, ''))
expectAssignable<PromiseLike<string>>(server.listen('3000', ''))

// Test variadic listen signatures Typescript deprecation
expectDeprecated(server.listen(3000))
expectDeprecated(server.listen('3000'))
expectDeprecated(server.listen(3000, '', 0))
expectDeprecated(server.listen('3000', '', 0))
expectDeprecated(server.listen(3000, ''))
expectDeprecated(server.listen('3000', ''))

// test listen opts objects
expectAssignable<PromiseLike<string>>(server.listen())
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000 }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0' }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '::/0', ipv6Only: true }))

expectAssignable<void>(server.listen(() => {}))
expectAssignable<void>(server.listen({ port: 3000 }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, listenTextResolver: (address) => { return `address: ${address}` } }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0' }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '::/0', ipv6Only: true }, () => {}))

// test listen opts objects Typescript deprectation exclusion
expectNotDeprecated(server.listen())
expectNotDeprecated(server.listen({ port: 3000 }))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0' }))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }))
expectNotDeprecated(server.listen({ port: 3000, host: '::/0', ipv6Only: true }))

expectNotDeprecated(server.listen(() => {}))
expectNotDeprecated(server.listen({ port: 3000 }, () => {}))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0' }, () => {}))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => {}))
expectNotDeprecated(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42, exclusive: true }, () => {}))
expectNotDeprecated(server.listen({ port: 3000, host: '::/0', ipv6Only: true }, () => {}))

// test after method
expectAssignable<FastifyInstance>(server.after())
expectAssignable<FastifyInstance>(server.after((err) => {
  expectType<Error | null>(err)
}))

// test ready method
expectAssignable<FastifyInstance>(server.ready())
expectAssignable<FastifyInstance>(server.ready((err) => {
  expectType<Error | null>(err)
}))

expectAssignable<void>(server.routing({} as RawRequestDefaultExpression, {} as RawReplyDefaultExpression))

expectType<FastifyInstance>(fastify().get<RouteGenericInterface, { contextKey: string }>('/', {
  handler: () => {},
  errorHandler: (error, request, reply) => {
    expectAssignable<FastifyError>(error)
    expectAssignable<FastifyRequest>(request)
    expectAssignable<{ contextKey: string }>(request.routeConfig)
    expectAssignable<FastifyReply>(reply)
    expectAssignable<void>(server.errorHandler(error, request, reply))
  }
}))

expectType<FastifyInstance>(fastify().get('/', {
  handler: () => {},
  childLoggerFactory: (logger, bindings, opts, req) => {
    expectAssignable<FastifyBaseLogger>(server.childLoggerFactory(logger, bindings, opts, req))
    return server.childLoggerFactory(logger, bindings, opts, req)
  }
}))

expectAssignable<FastifyInstance>(
  server.setChildLoggerFactory(function (logger, bindings, opts, req) {
    expectType<FastifyBaseLogger>(logger)
    expectType<Bindings>(bindings)
    expectType<ChildLoggerOptions>(opts)
    expectType<RawRequestDefaultExpression>(req)
    expectAssignable<FastifyInstance>(this)
    return logger.child(bindings, opts)
  })
)

expectAssignable<FastifyInstance>(
  server.setErrorHandler<FastifyError>(function (error, request, reply) {
    expectType<FastifyError>(error)
  })
)

function childLoggerFactory (this: FastifyInstance, logger: FastifyBaseLogger, bindings: Bindings, opts: ChildLoggerOptions, req: RawRequestDefaultExpression) {
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
  disableRequestLogging?: boolean,
  maxParamLength?: number,
  onProtoPoisoning?: 'error' | 'remove' | 'ignore',
  onConstructorPoisoning?: 'error' | 'remove' | 'ignore',
  pluginTimeout?: number,
  requestIdHeader?: string | false,
  requestIdLogLabel?: string,
  http2SessionTimeout?: number
}>

expectType<InitialConfig>(fastify().initialConfig)

expectType<FastifyBodyParser<string>>(server.defaultTextParser)

expectType<FastifyBodyParser<string>>(server.getDefaultJsonParser('ignore', 'error'))

expectType<string>(server.printRoutes({ includeHooks: true, commonPrefix: false, includeMeta: true }))

expectType<string>(server.printRoutes({ includeMeta: ['key1', Symbol('key2')] }))

expectType<string>(server.printRoutes({ method: 'GET' }))

expectType<string>(server.printRoutes())

server.decorate<(x: string) => void>('test', function (x: string): void {
  expectType<FastifyInstance>(this)
})
server.decorate('test', function (x: string): void {
  expectType<FastifyInstance>(this)
})
server.decorate<string>('test', {
  getter () {
    expectType<FastifyInstance>(this)
    return 'foo'
  }
})
server.decorate<string>('test', {
  getter () {
    expectType<FastifyInstance>(this)
    return 'foo'
  },
  setter (x) {
    expectType<string>(x)
    expectType<FastifyInstance>(this)
  }
})
server.decorate('test')
server.decorate('test', null, ['foo'])

server.decorateRequest<(x: string, y: number) => void>('test', function (x: string, y: number): void {
  expectType<FastifyRequest>(this)
})
server.decorateRequest('test', function (x: string, y: number): void {
  expectType<FastifyRequest>(this)
})
server.decorateRequest('test')
server.decorateRequest('test', null, ['foo'])

server.decorateReply<(x: string) => void>('test', function (x: string): void {
  expectType<FastifyReply>(this)
})
server.decorateReply('test', function (x: string): void {
  expectType<FastifyReply>(this)
})
server.decorateReply('test')
server.decorateReply('test', null, ['foo'])

expectError(server.decorate<string>('test', true))
expectError(server.decorate<(myNumber: number) => number>('test', function (myNumber: number): string {
  return ''
}))
expectError(server.decorate<string>('test', {
  getter () {
    return true
  }
}))
expectError(server.decorate<string>('test', {
  setter (x) {}
}))

declare module '../../fastify' {
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
    expectType<boolean>(x)
    expectType<FastifyInstance>(this)
  }
})
server.decorate('typedTestProperty')
server.decorate('typedTestProperty', null, ['foo'])
server.decorate('typedTestProperty', null)
expectError(server.decorate('typedTestProperty', 'foo'))
expectError(server.decorate('typedTestProperty', {
  getter () {
    return 'foo'
  }
}))
server.decorate('typedTestMethod', function (x) {
  expectType<string>(x)
  expectType<FastifyInstance>(this)
  return 'foo'
})
server.decorate('typedTestMethod', x => x)
expectError(server.decorate('typedTestMethod', function (x: boolean) {
  return 'foo'
}))
expectError(server.decorate('typedTestMethod', function (x) {
  return true
}))
expectError(server.decorate('typedTestMethod', async function (x) {
  return 'foo'
}))

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
    expectType<boolean>(x)
    expectType<FastifyRequest>(this)
  }
})
server.decorateRequest('typedTestRequestProperty')
server.decorateRequest('typedTestRequestProperty', null, ['foo'])
server.decorateRequest('typedTestRequestProperty', null)
expectError(server.decorateRequest('typedTestRequestProperty', 'foo'))
expectError(server.decorateRequest('typedTestRequestProperty', {
  getter () {
    return 'foo'
  }
}))
server.decorateRequest('typedTestRequestMethod', function (x) {
  expectType<string>(x)
  expectType<FastifyRequest>(this)
  return 'foo'
})
server.decorateRequest('typedTestRequestMethod', x => x)
expectError(server.decorateRequest('typedTestRequestMethod', function (x: boolean) {
  return 'foo'
}))
expectError(server.decorateRequest('typedTestRequestMethod', function (x) {
  return true
}))
expectError(server.decorateRequest('typedTestRequestMethod', async function (x) {
  return 'foo'
}))

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
    expectType<boolean>(x)
    expectType<FastifyReply>(this)
  }
})
server.decorateReply('typedTestReplyProperty')
server.decorateReply('typedTestReplyProperty', null, ['foo'])
server.decorateReply('typedTestReplyProperty', null)
expectError(server.decorateReply('typedTestReplyProperty', 'foo'))
expectError(server.decorateReply('typedTestReplyProperty', {
  getter () {
    return 'foo'
  }
}))
server.decorateReply('typedTestReplyMethod', function (x) {
  expectType<string>(x)
  expectType<FastifyReply>(this)
  return 'foo'
})
server.decorateReply('typedTestReplyMethod', x => x)
expectError(server.decorateReply('typedTestReplyMethod', function (x: boolean) {
  return 'foo'
}))
expectError(server.decorateReply('typedTestReplyMethod', function (x) {
  return true
}))
expectError(server.decorateReply('typedTestReplyMethod', async function (x) {
  return 'foo'
}))

const versionConstraintStrategy = {
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
expectType<void>(server.addConstraintStrategy(versionConstraintStrategy))
expectType<boolean>(server.hasConstraintStrategy(versionConstraintStrategy.name))

expectType<boolean>(server.hasPlugin(''))

expectAssignable<DefaultRoute<RawRequestDefaultExpression, RawReplyDefaultExpression>>(server.getDefaultRoute())

expectType<FastifySchemaCompiler<any> | undefined>(server.validatorCompiler)
expectType<FastifySerializerCompiler<any> | undefined>(server.serializerCompiler)
