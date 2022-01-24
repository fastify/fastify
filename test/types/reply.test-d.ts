import * as http from 'http'
import { expectError, expectType } from 'tsd'
import fastify, { FastifyContext, FastifyContextConfig, FastifyReply, FastifyRequest, RouteHandler, RouteHandlerMethod } from '../../fastify'
import { FastifyInstance } from '../../types/instance'
import { FastifyLoggerInstance } from '../../types/logger'
import { RouteContextDefault } from '../../types/utils'

const getHandler: RouteHandlerMethod = function (_request, reply) {
  expectType<http.ServerResponse>(reply.raw)
  expectType<FastifyContext<RouteContextDefault>>(reply.context)
  expectType<FastifyContextConfig>(reply.context.config)
  expectType<FastifyLoggerInstance>(reply.log)
  expectType<FastifyRequest>(reply.request)
  expectType<(statusCode: number) => FastifyReply>(reply.code)
  expectType<(statusCode: number) => FastifyReply>(reply.status)
  expectType<number>(reply.statusCode)
  expectType<boolean>(reply.sent)
  expectType<((payload?: unknown) => FastifyReply)>(reply.send)
  expectType<(key: string, value: any) => FastifyReply>(reply.header)
  expectType<(values: {[key: string]: any}) => FastifyReply>(reply.headers)
  expectType<(key: string) => string | undefined>(reply.getHeader)
  expectType<() => { [key: string]: number | string | string[] | undefined }>(reply.getHeaders)
  expectType<(key: string) => void>(reply.removeHeader)
  expectType<(key: string) => boolean>(reply.hasHeader)
  expectType<{(statusCode: number, url: string): FastifyReply; (url: string): FastifyReply }>(reply.redirect)
  expectType<() => FastifyReply>(reply.hijack)
  expectType<() => void>(reply.callNotFound)
  expectType<() => number>(reply.getResponseTime)
  expectType<(contentType: string) => FastifyReply>(reply.type)
  expectType<(fn: (payload: any) => string) => FastifyReply>(reply.serializer)
  expectType<(payload: any) => string>(reply.serialize)
  expectType<(fulfilled: () => void, rejected: (err: Error) => void) => void>(reply.then)
  expectType<FastifyInstance>(reply.server)
}

interface ReplyPayload {
  Reply: {
    test: boolean;
  };
}

const typedHandler: RouteHandler<{ Route: ReplyPayload }> = async (request, reply) => {
  expectType<((payload?: ReplyPayload['Reply']) => FastifyReply<{ Route: ReplyPayload }>)>(reply.send)
}

const server = fastify()
server.get('/get', getHandler)
server.get('/typed', typedHandler)
server.get<{ Route: ReplyPayload }>('/get-generic-send', async function handler (request, reply) {
  reply.send({ test: true })
})
server.get<{ Route: ReplyPayload }>('/get-generic-return', async function handler (request, reply) {
  return { test: false }
})
expectError(server.get<{ Route: ReplyPayload }>('/get-generic-return-error', async function handler (request, reply) {
  reply.send({ foo: 'bar' })
}))
expectError(server.get<{ Route: ReplyPayload }>('/get-generic-return-error', async function handler (request, reply) {
  return { foo: 'bar' }
}))
