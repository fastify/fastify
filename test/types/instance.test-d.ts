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

expectAssignable<FastifyInstance>(server.use((req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
expectAssignable<FastifyInstance>(server.use('/foo', (req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
expectAssignable<FastifyInstance>(server.use(['/foo', '/bar'], (req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
