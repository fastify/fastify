import { expectType, expectError, expectAssignable } from 'tsd'
import fastify, { RouteHandlerMethod, RouteHandler, RawRequestDefaultExpression, FastifyContext, FastifyContextConfig, FastifyRequest, FastifyReply } from '../../fastify'
import { RawServerDefault, RawReplyDefaultExpression, ContextConfigDefault } from '../../types/utils'
import { FastifyLoggerInstance } from '../../types/logger'
import { RouteGenericInterface } from '../../types/route'
import { FastifyInstance } from '../../types/instance'
import { Buffer } from 'buffer'

type DefaultSerializationFunction = (payload: {[key: string]: unknown}) => string

const getHandler: RouteHandlerMethod = function (_request, reply) {
  expectType<RawReplyDefaultExpression>(reply.raw)
  expectType<FastifyContext<ContextConfigDefault>>(reply.context)
  expectType<FastifyContextConfig>(reply.context.config)
  expectType<FastifyLoggerInstance>(reply.log)
  expectType<FastifyRequest<RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression>>(reply.request)
  expectType<(statusCode: number) => FastifyReply>(reply.code)
  expectType<(statusCode: number) => FastifyReply>(reply.status)
  expectType<number>(reply.statusCode)
  expectType<boolean>(reply.sent)
  expectType<((payload?: unknown) => FastifyReply)>(reply.send)
  expectType<(key: string, value: any) => FastifyReply>(reply.header)
  expectType<(values: {[key: string]: any}) => FastifyReply>(reply.headers)
  expectType<(key: string) => number | string | string[] | undefined>(reply.getHeader)
  expectType<() => { [key: string]: number | string | string[] | undefined }>(reply.getHeaders)
  expectType<(key: string) => void>(reply.removeHeader)
  expectType<(key: string) => boolean>(reply.hasHeader)
  expectType<{(statusCode: number, url: string): FastifyReply; (url: string): FastifyReply }>(reply.redirect)
  expectType<() => FastifyReply>(reply.hijack)
  expectType<() => void>(reply.callNotFound)
  expectType<() => number>(reply.getResponseTime)
  expectType<(contentType: string) => FastifyReply>(reply.type)
  expectType<(fn: (payload: any) => string) => FastifyReply>(reply.serializer)
  expectType<(payload: any) => string | ArrayBuffer | Buffer>(reply.serialize)
  expectType<(fulfilled: () => void, rejected: (err: Error) => void) => void>(reply.then)
  expectType<FastifyInstance>(reply.server)
  expectAssignable<((httpStatus: string) => DefaultSerializationFunction)>(reply.getSerializationFunction)
  expectAssignable<((schema: {[key: string]: unknown}) => DefaultSerializationFunction)>(reply.getSerializationFunction)
  expectAssignable<((schema: {[key: string]: unknown}, httpStatus?: string) => DefaultSerializationFunction)>(reply.compileSerializationSchema)
  expectAssignable<((input: {[key: string]: unknown}, schema: {[key: string]: unknown}, httpStatus?: string) => unknown)>(reply.serializeInput)
  expectAssignable<((input: {[key: string]: unknown}, httpStatus: string) => unknown)>(reply.serializeInput)
}

interface ReplyPayload {
  Reply: {
    test: boolean;
  };
}

interface ReplyUnion {
  Reply: {
    success: boolean;
  } | {
    error: string;
  }
}

const typedHandler: RouteHandler<ReplyPayload> = async (request, reply) => {
  expectType<((payload?: ReplyPayload['Reply']) => FastifyReply<RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>, ReplyPayload>)>(reply.send)
}

const server = fastify()
server.get('/get', getHandler)
server.get('/typed', typedHandler)
server.get<ReplyPayload>('/get-generic-send', async function handler (request, reply) {
  reply.send({ test: true })
})
server.get<ReplyPayload>('/get-generic-return', async function handler (request, reply) {
  return { test: false }
})
expectError(server.get<ReplyPayload>('/get-generic-send-error', async function handler (request, reply) {
  reply.send({ foo: 'bar' })
}))
expectError(server.get<ReplyPayload>('/get-generic-return-error', async function handler (request, reply) {
  return { foo: 'bar' }
}))
server.get<ReplyUnion>('/get-generic-union-send', async function handler (request, reply) {
  if (0 as number === 0) {
    reply.send({ success: true })
  } else {
    reply.send({ error: 'error' })
  }
})
server.get<ReplyUnion>('/get-generic-union-return', async function handler (request, reply) {
  if (0 as number === 0) {
    return { success: true }
  } else {
    return { error: 'error' }
  }
})
expectError(server.get<ReplyUnion>('/get-generic-union-send-error-1', async function handler (request, reply) {
  reply.send({ successes: true })
}))
expectError(server.get<ReplyUnion>('/get-generic-union-send-error-2', async function handler (request, reply) {
  reply.send({ error: 500 })
}))
expectError(server.get<ReplyUnion>('/get-generic-union-return-error-1', async function handler (request, reply) {
  return { successes: true }
}))
expectError(server.get<ReplyUnion>('/get-generic-union-return-error-2', async function handler (request, reply) {
  return { error: 500 }
}))
