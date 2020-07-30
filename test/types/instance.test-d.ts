import fastify, { FastifyError, FastifyInstance } from '../../fastify';
import { expectAssignable, expectError, expectType } from 'tsd';

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

expectType<unknown>(server.use(() => {}))
expectType<unknown>(server.use('/foo', () => {}))

server.setErrorHandler((function (error, request, reply) {
  expectAssignable<FastifyInstance>(this)
}))

server.setErrorHandler<FastifyError>((function (error, request, reply) {
  expectType<FastifyError>(error)
}))

function fastifyErrorHandler(this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(fastifyErrorHandler)

function nodeJSErrorHandler(error: NodeJS.ErrnoException) {}
server.setErrorHandler(nodeJSErrorHandler)

function invalidErrorHandler(error: number) {}
expectError(server.setErrorHandler(invalidErrorHandler))

server.setReplySerializer((function (payload, statusCode) {
  expectType<unknown>(payload)
  expectType<number>(statusCode)
  return 'serialized'
}))

function invalidReplySerialzer(payload: number, statusCode: string) {}
expectError(server.setReplySerializer(invalidReplySerialzer))

function serializerWithInvalidReturn(payload: unknown, statusCode: number) {}
expectError(server.setReplySerializer(serializerWithInvalidReturn))

expectAssignable<PromiseLike<string>>(server.listen({ port: 3000 }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0' }))
expectAssignable<PromiseLike<string>>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }))
expectAssignable<void>(server.listen({ port: 3000 }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0' }, () => {}))
expectAssignable<void>(server.listen({ port: 3000, host: '0.0.0.0', backlog: 42 }, () => {}))
