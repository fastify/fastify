import fastify, { FastifyInstance } from '../../fastify'
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
