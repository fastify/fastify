import { expectType } from 'tsd'
import fastify, { RouteHandlerMethod, RawRequestDefaultExpression, FastifyContext, RequestGenericInterface, FastifyRequest, FastifyReply } from '../../fastify'
import { RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from '../../types/utils'
import { FastifyLoggerInstance } from '../../types/logger'

type TestPayload = {
  test: boolean
}

const getHandler: RouteHandlerMethod = function (_request, reply: FastifyReply<TestPayload>) {
  expectType<RawReplyDefaultExpression>(reply.raw)
  expectType<FastifyContext<ContextConfigDefault>>(reply.context)
  expectType<FastifyLoggerInstance>(reply.log)
  expectType<FastifyRequest<RequestGenericInterface, RawServerDefault, RawRequestDefaultExpression>>(reply.request)
  expectType<(statusCode: number) => FastifyReply<TestPayload>>(reply.code)
  expectType<(statusCode: number) => FastifyReply<TestPayload>>(reply.status)
  expectType<number>(reply.statusCode)
  expectType<boolean>(reply.sent)
  expectType<(key: string, value: any) => FastifyReply<TestPayload>>(reply.header)
  expectType<(values: {[key: string]: any}) => FastifyReply<TestPayload>>(reply.headers)
  expectType<(key: string) => string | undefined>(reply.getHeader)
  expectType<() => { [key: string]: number | string | string[] | undefined; }>(reply.getHeaders)
  expectType<(key: string) => void>(reply.removeHeader)
  expectType<(key: string) => boolean>(reply.hasHeader)
  expectType<{ (statusCode: number, url: string): FastifyReply<TestPayload>; (url: string): FastifyReply<TestPayload>; }>(reply.redirect)
  expectType<() => void>(reply.callNotFound)
  expectType<() => number>(reply.getResponseTime)
  expectType<(contentType: string) => FastifyReply<TestPayload>>(reply.type)
  expectType<(fn: (payload: any) => string) => FastifyReply<TestPayload>>(reply.serializer)
  expectType<(payload: any) => string>(reply.serialize)
  expectType<(fullfilled: () => void, rejected: (err: Error) => void) => void>(reply.then)
  expectType<((payload?: TestPayload) => FastifyReply<TestPayload>)>(reply.send)
}

function defaultHandler(_request: FastifyRequest, reply: FastifyReply) {
  expectType<((payload?: unknown) => FastifyReply)>(reply.send)
}

const server = fastify()
server.get('/get', getHandler)
server.post('/default', defaultHandler)
