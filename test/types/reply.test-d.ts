import { expectType } from 'tsd'
import fastify, { RouteHandlerMethod, RawRequestDefaultExpression, FastifyContext, RequestGenericInterface, FastifyRequest, FastifyReply } from '../../fastify'
import { RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from '../../types/utils'
import { FastifyLoggerInstance } from '../../types/logger'

const getHandler: RouteHandlerMethod = function (_request, reply) {
  expectType<RawReplyDefaultExpression>(reply.raw)
  expectType<FastifyContext<ContextConfigDefault>>(reply.context)
  expectType<FastifyLoggerInstance>(reply.log)
  expectType<FastifyRequest<RequestGenericInterface, RawServerDefault, RawRequestDefaultExpression>>(reply.request)
  expectType<(statusCode: number) => FastifyReply>(reply.code)
  expectType<(statusCode: number) => FastifyReply>(reply.status)
  expectType<number>(reply.statusCode)
  expectType<boolean>(reply.sent)
  expectType<(<T>(payload?: T) => FastifyReply)>(reply.send)
  expectType<(key: string, value: any) => FastifyReply>(reply.header)
  expectType<(values: {[key: string]: any}) => FastifyReply>(reply.headers)
  expectType<(key: string) => string | undefined>(reply.getHeader)
  expectType<() => { [key: string]: number | string | string[] | undefined; }>(reply.getHeaders)
  expectType<(key: string) => void>(reply.removeHeader)
  expectType<(key: string) => boolean>(reply.hasHeader)
  expectType<{ (statusCode: number, url: string): FastifyReply; (url: string): FastifyReply; }>(reply.redirect)
  expectType<() => void>(reply.callNotFound)
  expectType<() => number>(reply.getResponseTime)
  expectType<(contentType: string) => FastifyReply>(reply.type)
  expectType<(fn: (payload: any) => string) => FastifyReply>(reply.serializer)
  expectType<(payload: any) => string>(reply.serialize)
  expectType<(fullfilled: () => void, rejected: (err: Error) => void) => void>(reply.then)
}

const server = fastify()
server.get('/get', getHandler)
