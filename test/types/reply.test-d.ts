import { Buffer } from 'node:buffer'
import { expect } from 'tstyche'
import fastify, {
  type FastifyContextConfig,
  type FastifyReply,
  type FastifyRequest,
  type FastifySchema,
  type FastifyTypeProviderDefault,
  type RawRequestDefaultExpression,
  type RouteHandler,
  type RouteHandlerMethod
} from '../../fastify.js'
import type { FastifyInstance } from '../../types/instance.js'
import type { FastifyBaseLogger } from '../../types/logger.js'
import type { ResolveReplyTypeWithRouteGeneric } from '../../types/reply.js'
import type { FastifyRouteConfig, RouteGenericInterface } from '../../types/route.js'
import type { ContextConfigDefault, RawReplyDefaultExpression, RawServerDefault } from '../../types/utils.js'

type DefaultSerializationFunction = (payload: { [key: string]: unknown }) => string
type DefaultFastifyReplyWithCode<Code extends number> = FastifyReply<RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, ContextConfigDefault, FastifySchema, FastifyTypeProviderDefault, ResolveReplyTypeWithRouteGeneric<RouteGenericInterface['Reply'], Code, FastifySchema, FastifyTypeProviderDefault>>

const getHandler: RouteHandlerMethod = function (_request, reply) {
  expect(reply.raw).type.toBe<RawReplyDefaultExpression>()
  expect(reply.log).type.toBe<FastifyBaseLogger>()
  expect(reply.request).type.toBe<FastifyRequest<RouteGenericInterface, RawServerDefault, RawRequestDefaultExpression>>()
  expect(reply.code).type.toBe<<Code extends number>(statusCode: Code) => DefaultFastifyReplyWithCode<Code>>()
  expect(reply.status).type.toBe<<Code extends number>(statusCode: Code) => DefaultFastifyReplyWithCode<Code>>()
  expect(reply.code(100 as number).send).type.toBe<(payload?: unknown) => FastifyReply>()
  expect(reply.elapsedTime).type.toBe<number>()
  expect(reply.statusCode).type.toBe<number>()
  expect(reply.sent).type.toBe<boolean>()
  expect(reply.writeEarlyHints).type.toBe<
    (hints: Record<string, string | string[]>, callback?: (() => void) | undefined) => void
  >()
  expect(reply.send).type.toBe<((payload?: unknown) => FastifyReply)>()
  expect(reply.header).type.toBeAssignableTo<(key: string, value: any) => FastifyReply>()
  expect(reply.headers).type.toBeAssignableTo<(values: { [key: string]: any }) => FastifyReply>()
  expect(reply.getHeader).type.toBeAssignableTo<(key: string) => number | string | string[] | undefined>()
  expect(reply.getHeaders).type.toBeAssignableTo<() => { [key: string]: number | string | string[] | undefined }>()
  expect(reply.removeHeader).type.toBeAssignableTo<(key: string) => FastifyReply>()
  expect(reply.hasHeader).type.toBeAssignableTo<(key: string) => boolean>()
  expect(reply.redirect).type.toBe<(url: string, statusCode?: number) => FastifyReply>()
  expect(reply.hijack).type.toBe<() => FastifyReply>()
  expect(reply.callNotFound).type.toBe<() => void>()
  expect(reply.type).type.toBe<(contentType: string) => FastifyReply>()
  expect(reply.serializer).type.toBe<(fn: (payload: any) => string) => FastifyReply>()
  expect(reply.serialize).type.toBe<(payload: any) => string | ArrayBuffer | Buffer>()
  expect(reply.then).type.toBe<(fulfilled: () => void, rejected: (err: Error) => void) => void>()
  expect(reply.trailer).type.toBe<
      (
      key: string,
      fn: ((reply: FastifyReply, payload: string | Buffer | null) => Promise<string>) |
      ((reply: FastifyReply, payload: string | Buffer | null,
        done: (err: Error | null, value?: string) => void) => void)
    ) => FastifyReply
  >()
  expect(reply.hasTrailer).type.toBe<(key: string) => boolean>()
  expect(reply.removeTrailer).type.toBe<(key: string) => FastifyReply>()
  expect(reply.server).type.toBe<FastifyInstance>()
  expect(reply.getSerializationFunction).type.toBeAssignableTo<
    ((httpStatus: string) => DefaultSerializationFunction | undefined)
  >()
  expect(reply.getSerializationFunction).type.toBeAssignableTo<
    ((schema: { [key: string]: unknown }) => DefaultSerializationFunction | undefined)
  >()
  expect(reply.compileSerializationSchema).type.toBeAssignableTo<
    ((schema: { [key: string]: unknown }, httpStatus?: string) => DefaultSerializationFunction)
  >()
  expect(reply.serializeInput).type.toBeAssignableTo<
    ((input: { [key: string]: unknown }, schema: { [key: string]: unknown }, httpStatus?: string) => unknown)
  >()
  expect(reply.serializeInput).type.toBeAssignableTo<((input: { [key: string]: unknown }, httpStatus: string) => unknown)>()
  expect(reply.routeOptions.config).type.toBe<ContextConfigDefault & FastifyRouteConfig & FastifyContextConfig>()
  expect(reply.getDecorator<string>('foo')).type.toBe<string>()
}

interface ReplyPayload {
  Reply: {
    test: boolean;
  };
}

interface ReplyArrayPayload {
  Reply: string[]
}

interface ReplyUnion {
  Reply: {
    success: boolean;
  } | {
    error: string;
  }
}

interface ReplyHttpCodes {
  Reply: {
    '1xx': number,
    200: 'abc',
    201: boolean,
    300: { foo: string },
  }
}

interface InvalidReplyHttpCodes {
  Reply: {
    '1xx': number,
    200: string,
    999: boolean,
  }
}

interface ReplyVoid {
  Reply: void;
}

interface ReplyUndefined {
  Reply: undefined;
}

// Issue #5534 scenario: 204 No Content should allow empty send(), 201 Created should require payload
// Note: `204: undefined` gets converted to `unknown` via UndefinedToUnknown in type-provider.d.ts,
// meaning send() is optional but send({}) is also allowed. Use `void` instead of `undefined`
// if you want stricter "no payload allowed" semantics.
interface ReplyHttpCodesWithNoContent {
  Reply: {
    201: { id: string };
    204: undefined;
  }
}

const typedHandler: RouteHandler<ReplyPayload> = async (request, reply) => {
  // When Reply type is specified, send() requires a payload argument
  expect(reply.send).type.toBe<((...args: [payload: ReplyPayload['Reply']]) => FastifyReply<ReplyPayload, RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>>)>()
  expect(reply.code(100).send).type.toBe<((...args: [payload: ReplyPayload['Reply']]) => FastifyReply<ReplyPayload, RawServerDefault, RawRequestDefaultExpression<RawServerDefault>, RawReplyDefaultExpression<RawServerDefault>>)>()
}

const server = fastify()
server.get('/get', getHandler)
server.get('/typed', typedHandler)
server.get<ReplyPayload>('/get-generic-send', async function handler (request, reply) {
  reply.send({ test: true })
})
// When Reply type is specified, send() requires a payload - calling without arguments should error
server.get<ReplyPayload>('/get-generic-send-missing-payload', async function handler (request, reply) {
  // @ts-expect-error!
  reply.send()
})
server.get<ReplyPayload>('/get-generic-return', async function handler (request, reply) {
  return { test: false }
})
server.get<ReplyPayload>('/get-generic-send-error', async function handler (request, reply) {
  // @ts-expect-error!
  reply.send({ foo: 'bar' })
})
// @ts-expect-error!
server.get<ReplyPayload>('/get-generic-return-error', async function handler (request, reply) {
  return { foo: 'bar' }
})
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
server.get<ReplyUnion>('/get-generic-union-send-error-1', async function handler (request, reply) {
  // @ts-expect-error!
  reply.send({ successes: true })
})
server.get<ReplyUnion>('/get-generic-union-send-error-2', async function handler (request, reply) {
  // @ts-expect-error!
  reply.send({ error: 500 })
})
// @ts-expect-error!
server.get<ReplyUnion>('/get-generic-union-return-error-1', async function handler (request, reply) {
  return { successes: true }
})
// @ts-expect-error!
server.get<ReplyUnion>('/get-generic-union-return-error-2', async function handler (request, reply) {
  return { error: 500 }
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send', async function handler (request, reply) {
  reply.code(200).send('abc')
  reply.code(201).send(true)
  reply.code(300).send({ foo: 'bar' })
  reply.code(101).send(123)
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send-error-1', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(200).send('def')
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send-error-2', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(201).send(0)
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send-error-3', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(300).send({ foo: 123 })
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send-error-4', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(100).send('asdasd')
})
server.get<ReplyHttpCodes>('/get-generic-http-codes-send-error-5', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(401).send({ foo: 123 })
})
server.get<ReplyArrayPayload>('/get-generic-array-send', async function handler (request, reply) {
  reply.code(200).send([''])
})
server.get<InvalidReplyHttpCodes>('get-invalid-http-codes-reply-error', async function handler (request, reply) {
  // @ts-expect-error!
  reply.code(200).send('')
})
server.get<InvalidReplyHttpCodes>('get-invalid-http-codes-reply-error', async function handler (request, reply) {
  reply.code(200).send({
    '1xx': 0,
    200: '',
    999: false
  })
})

/* eslint-disable @typescript-eslint/no-unused-vars */
const httpHeaderHandler: RouteHandlerMethod = function (_request, reply) {
  // accept is a header provided by @types/node
  reply.getHeader('accept')
  /* eslint-disable @typescript-eslint/no-unused-expressions */
  reply.getHeaders().accept
  reply.hasHeader('accept')
  reply.header('accept', 'test')
  reply.headers({ accept: 'test' })
  reply.removeHeader('accept')

  // x-fastify-test is not a header provided by @types/node
  // and should not result in a typing error
  reply.getHeader('x-fastify-test')
  reply.getHeaders()['x-fastify-test']
  reply.hasHeader('x-fastify-test')
  reply.header('x-fastify-test', 'test')
  reply.headers({ 'x-fastify-test': 'test' })
  reply.removeHeader('x-fastify-test')
}

// Test: send() without arguments is valid when no Reply type is specified (default unknown)
server.get('/get-no-type-send-empty', async function handler (request, reply) {
  reply.send()
})

// Test: send() without arguments is valid when Reply type is void
server.get<ReplyVoid>('/get-void-send-empty', async function handler (request, reply) {
  reply.send()
})

// Test: send() without arguments is valid when Reply type is undefined
server.get<ReplyUndefined>('/get-undefined-send-empty', async function handler (request, reply) {
  reply.send()
})

// Issue #5534 scenario: HTTP status codes with 204 No Content
server.get<ReplyHttpCodesWithNoContent>('/get-http-codes-no-content', async function handler (request, reply) {
  // 204 No Content - send() without payload is valid because Reply is undefined
  reply.code(204).send()
  // 201 Created - send() requires payload
  reply.code(201).send({ id: '123' })
})
// 201 Created without payload should error
server.get<ReplyHttpCodesWithNoContent>('/get-http-codes-201-missing-payload', async function handler (request, reply) {
  // @ts-expect-error  Expected 1 arguments
  reply.code(201).send()
})
