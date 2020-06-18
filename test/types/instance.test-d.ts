import fastify, { FastifyError, FastifyInstance } from '../../fastify';
import { expectAssignable } from 'tsd'

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

server.setErrorHandler((function (error, request, reply) {
  expectAssignable<FastifyInstance>(this)
}))

function errorHandler(this: FastifyInstance, error: FastifyError) {}
server.setErrorHandler(errorHandler)
