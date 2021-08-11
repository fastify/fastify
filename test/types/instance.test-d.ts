import fastify, {
  FastifyBodyParser,
  FastifyError,
  FastifyInstance,
  FastifyLoggerInstance,
  ValidationResult
} from '../../fastify'
import { expectAssignable, expectError, expectNotAssignable, expectType } from 'tsd'
import { FastifyRequest } from '../../types/request'
import { FastifyReply } from '../../types/reply'
import { HookHandlerDoneFunction } from '../../types/hooks'

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

expectType<Record<string, unknown>>(server.getSchemas())
expectType<unknown>(server.getSchema('SchemaId'))
expectType<string>(server.printRoutes())
expectType<string>(server.printPlugins())

expectAssignable<FastifyInstance>(
  server.setErrorHandler(function (error, request, reply) {
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

function nodeJSErrorHandler (error: NodeJS.ErrnoException) {}
server.setErrorHandler(nodeJSErrorHandler)

function notFoundHandler (request: FastifyRequest, reply: FastifyReply) {}
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

function invalidErrorHandler (error: number) {}
expectError(server.setErrorHandler(invalidErrorHandler))

server.setReplySerializer(function (payload, statusCode) {
  expectType<unknown>(payload)
  expectType<number>(statusCode)
  return 'serialized'
})

function invalidReplySerializer (payload: number, statusCode: string) {}
expectError(server.setReplySerializer(invalidReplySerializer))

function serializerWithInvalidReturn (payload: unknown, statusCode: number) {}
expectError(server.setReplySerializer(serializerWithInvalidReturn))

function invalidSchemaErrorFormatter () {}
expectError(server.setSchemaErrorFormatter(invalidSchemaErrorFormatter))

// test listen method callback
expectAssignable<void>(server.listen(3000, '', 0, (err, address) => {}))
expectAssignable<void>(server.listen('3000', '', 0, (err, address) => {}))
expectAssignable<void>(server.listen(3000, '', (err, address) => {}))
expectAssignable<void>(server.listen('3000', '', (err, address) => {}))
expectAssignable<void>(server.listen(3000, (err, address) => {}))
expectAssignable<void>(server.listen('3000', (err, address) => {}))

// test listen method promise
expectAssignable<PromiseLike<string>>(server.listen(3000))
expectAssignable<PromiseLike<string>>(server.listen('3000'))
expectAssignable<PromiseLike<string>>(server.listen(3000, '', 0))
expectAssignable<PromiseLike<string>>(server.listen('3000', '', 0))
expectAssignable<PromiseLike<string>>(server.listen(3000, ''))
expectAssignable<PromiseLike<string>>(server.listen('3000', ''))

// test listen opts objects
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000 }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0' }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }))
expectAssignable<void>(server.listen({ port: 3000 }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0' }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => {}))

expectType<FastifyInstance>(fastify().get('/', {
  handler: () => {},
  errorHandler: (error, request, reply) => {
    expectAssignable<void>(server.errorHandler(error, request, reply))
  }
}))

type InitialConfig = Readonly<{
  connectionTimeout?: number,
  keepAliveTimeout?: number,
  bodyLimit?: number,
  caseSensitive?: boolean,
  http2?: boolean,
  https?: boolean | Readonly<{ allowHTTP1: boolean }>,
  ignoreTrailingSlash?: boolean,
  disableRequestLogging?: boolean,
  maxParamLength?: number,
  onProtoPoisoning?: 'error' | 'remove' | 'ignore',
  onConstructorPoisoning?: 'error' | 'remove' | 'ignore',
  pluginTimeout?: number,
  requestIdHeader?: string,
  requestIdLogLabel?: string,
  http2SessionTimeout?: number
}>

expectType<InitialConfig>(fastify().initialConfig)

expectType<FastifyBodyParser<string>>(server.defaultTextParser)

expectType<FastifyBodyParser<string>>(server.getDefaultJsonParser('ignore', 'error'))

expectType<string>(server.printRoutes({ includeHooks: true, commonPrefix: false, includeMeta: true }))

expectType<string>(server.printRoutes({ includeMeta: ['key1', Symbol('key2')] }))

expectType<string>(server.printRoutes())

server.decorate<(x: string) => void>('test', function (x: string): void {
  expectType<FastifyInstance>(this)
})
server.decorate('test', function (x: string): void {
  expectType<FastifyInstance>(this)
})

server.decorateRequest<(x: string, y: number) => void>('test', function (x: string, y: number): void {
  expectType<FastifyRequest>(this)
})
server.decorateRequest('test', function (x: string, y: number): void {
  expectType<FastifyRequest>(this)
})

server.decorateReply<(x: string) => void>('test', function (x: string): void {
  expectType<FastifyReply>(this)
})
server.decorateReply('test', function (x: string): void {
  expectType<FastifyReply>(this)
})

expectError(server.decorate<string>('test', true))
expectError(server.decorate<(myNumber: number) => number>('test', function (myNumber: number): string {
  return ''
}))
