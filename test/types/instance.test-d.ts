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

expectType<void>(server.use((req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
expectType<void>(server.use('/foo', (req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
expectType<void>(server.use(['/foo', '/bar'], (req, res, next) => {
  expectType<IncomingMessage>(req)
  expectType<ServerResponse>(res)
  expectType<void>(next())
  expectType<void>(next(new Error('foo')))
}))
