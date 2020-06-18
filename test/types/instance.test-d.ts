import fastify, { FastifyError, FastifyInstance } from '../../fastify';
import { expectAssignable, expectType } from 'tsd'
import { IncomingMessage, ServerResponse } from 'http'

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

expectType<unknown>(server.use(() => {}))
expectType<unknown>(server.use('/foo', () => {}))

server.setErrorHandler((function (error, request, reply) {
  expectAssignable<FastifyInstance>(this)
}))

function errorHandler(this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(errorHandler)
