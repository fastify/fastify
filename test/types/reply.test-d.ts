import { expectType } from 'tsd'
import fastify, { RouteHandlerMethod, RouteHandler, RawRequestDefaultExpression, FastifyContext, FastifyRequest, FastifyReply } from '../../fastify'
import { RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault, RawServerBase } from '../../types/utils'
import { FastifyLoggerInstance } from '../../types/logger'
import { RouteGenericInterface } from '../../types/route'

const getHandler: RouteHandlerMethod = function (_request, reply) {
  expectType<RawReplyDefaultExpression>(reply.raw)
  expectType<FastifyContext<ContextConfigDefault>>(reply.context)
  expectType<FastifyLoggerInstance>(reply.log)
  expectType<FastifyRequest<RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression>>(reply.request)
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

const typedHandler: RouteHandler<{ Reply: { test: boolean } }> = async (request, reply) => {
  expectType<(<T = { test: boolean; }>(payload?: T) => FastifyReply<RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>, { Reply: { test: boolean } }>)>(reply.send)
}

const server = fastify()
server.get('/get', getHandler)
server.get('/typed', typedHandler)
