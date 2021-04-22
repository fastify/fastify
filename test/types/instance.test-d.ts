import fastify, { FastifyBodyParser, FastifyError, FastifyInstance, ValidationResult } from '../../fastify'
import { expectAssignable, expectError, expectType } from 'tsd'
import { FastifyRequest } from '../../types/request'
import { FastifyReply } from '../../types/reply'
import { HookHandlerDoneFunction } from '../../types/hooks'

const server = fastify()

server.decorate('nonexistent', () => {})
server.decorateRequest('nonexistent', () => {})
server.decorateReply('nonexistent', () => {})

declare module '../../fastify' {
  interface FastifyInstance {
    functionWithTypeDefinition: (foo: string, bar: number) => Promise<boolean>
  }
  interface FastifyRequest {
    numberWithTypeDefinition: number
  }
  interface FastifyReply {
    stringWithTypeDefinition: 'foo' | 'bar'
  }
}
expectError(server.decorate('functionWithTypeDefinition', (foo: any, bar: any) => {})) // error because invalid return type
expectError(server.decorate('functionWithTypeDefinition', (foo: any, bar: any) => true)) // error because doesn't return a promise
expectError(server.decorate('functionWithTypeDefinition', async (foo: any, bar: any, qwe: any) => true)) // error because too many args
expectAssignable<FastifyInstance>(server.decorate('functionWithTypeDefinition', async (foo, bar) => {
  expectType<string>(foo)
  expectType<number>(bar)
  return true
}))

expectError(server.decorateRequest('numberWithTypeDefinition', 'not a number')) // error because invalid type
expectAssignable<FastifyInstance>(server.decorateRequest('numberWithTypeDefinition', 10))

expectError(server.decorateReply('stringWithTypeDefinition', 'not in enum')) // error because invalid type
expectAssignable<FastifyInstance>(server.decorateReply('stringWithTypeDefinition', 'foo'))

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
