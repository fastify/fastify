import fastify, { FastifyError, FastifyInstance, ValidationResult } from '../../fastify'
import { expectAssignable, expectError, expectType } from 'tsd'

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

expectType<ValidationResult[] | undefined>(FastifyError().validation)

function fastifyErrorHandler (this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(fastifyErrorHandler)

function nodeJSErrorHandler (error: NodeJS.ErrnoException) {}
server.setErrorHandler(nodeJSErrorHandler)

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
