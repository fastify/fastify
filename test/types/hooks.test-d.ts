import * as http from 'node:http'
import type { FastifyError } from '@fastify/error'
import { expect } from 'tstyche'
import fastify, {
  type ContextConfigDefault,
  type FastifyContextConfig,
  type FastifyInstance,
  type FastifyPluginOptions,
  type FastifyReply,
  type FastifyRequest,
  type FastifySchema,
  type FastifyTypeProviderDefault,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
  type RegisterOptions,
  type RouteOptions,
  // preClose hook types should be exported correctly https://github.com/fastify/fastify/pull/5335
  /* eslint-disable @typescript-eslint/no-unused-vars */
  type preCloseAsyncHookHandler,
  type preCloseHookHandler
} from '../../fastify.js'
import type { DoneFuncWithErrOrRes, HookHandlerDoneFunction, RequestPayload, preHandlerAsyncHookHandler } from '../../types/hooks.js'
import type { FastifyRouteConfig, RouteGenericInterface } from '../../types/route.js'

const server = fastify()

// Test payload generic pass through for preSerialization and onSend

type TestPayloadType = {
  foo: string;
  bar: number;
}

// Synchronous Tests

server.addHook('onRequest', function (request, reply, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('preParsing', function (request, reply, payload, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<RequestPayload>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError | null, res?: RequestPayload) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('preValidation', function (request, reply, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('preHandler', function (request, reply, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook<TestPayloadType>('preSerialization', function (request, reply, payload, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<TestPayloadType>() // we expect this to be unknown when not specified like in the previous test
  expect(done(new Error())).type.toBe<void>()
  expect(done(null, 'foobar')).type.toBe<void>()
  expect(done()).type.toBe<void>()
  expect(done).type.not.toBeCallableWith(new Error(), 'foobar')
})

server.addHook<TestPayloadType>('onSend', function (request, reply, payload, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<TestPayloadType>()
  expect(done(new Error())).type.toBe<void>()
  expect(done(null, 'foobar')).type.toBe<void>()
  expect(done()).type.toBe<void>()
  expect(done).type.not.toBeCallableWith(new Error(), 'foobar')
})

server.addHook('onResponse', function (request, reply, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('onTimeout', function (request, reply, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('onError', function (request, reply, error, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(error).type.toBe<FastifyError>()
  expect(done).type.toBe<() => void>()
  expect(done()).type.toBe<void>()
})

server.addHook('onRequestAbort', function (request, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('onRoute', function (opts) {
  expect(this).type.toBe<FastifyInstance>()
  expect(opts).type.toBe<RouteOptions & { routePath: string; path: string; prefix: string }>()
})

server.addHook('onRegister', function (instance, opts) {
  expect(this).type.toBe<FastifyInstance>()
  expect(instance).type.toBe<FastifyInstance>()
  expect(opts).type.toBe<RegisterOptions & FastifyPluginOptions>()
})

server.addHook('onReady', function (done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('onListen', function (done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
})

server.addHook('onClose', function (instance, done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(instance).type.toBe<FastifyInstance>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

// Asynchronous

server.addHook('onRequest', async function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

server.addHook('preParsing', async function (request, reply, payload) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<RequestPayload>()
})

server.addHook('preValidation', async function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

server.addHook('preHandler', async function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

server.addHook<TestPayloadType>('preSerialization', async function (request, reply, payload) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<TestPayloadType>() // we expect this to be unknown when not specified like in the previous test
})

server.addHook<TestPayloadType>('onSend', async function (request, reply, payload) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(payload).type.toBe<TestPayloadType>()
})

server.addHook('onResponse', async function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

server.addHook('onTimeout', async function (request, reply) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

server.addHook('onError', async function (request, reply, error) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
  expect(error).type.toBe<FastifyError>()
})

server.addHook('onRequestAbort', async function (request) {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBe<FastifyRequest>()
})

server.addHook('onRegister', async (instance, opts) => {
  expect(instance).type.toBe<FastifyInstance>()
  expect(opts).type.toBe<RegisterOptions & FastifyPluginOptions>()
})

server.addHook('onReady', async function () {
  expect(this).type.toBe<FastifyInstance>()
})

server.addHook('onListen', async function () {
  expect(this).type.toBe<FastifyInstance>()
})

server.addHook('onClose', async function (instance) {
  expect(this).type.toBe<FastifyInstance>()
  expect(instance).type.toBe<FastifyInstance>()
})

// Use case to monitor any regression on issue #3620
// ref.: https://github.com/fastify/fastify/issues/3620
const customTypedHook: preHandlerAsyncHookHandler<
RawServerDefault,
RawRequestDefaultExpression,
RawReplyDefaultExpression,
RouteGenericInterface,
ContextConfigDefault,
FastifySchema,
FastifyTypeProviderDefault
> = async function (request, reply): Promise<void> {
  expect(this).type.toBe<FastifyInstance>()
  expect(request).type.toBeAssignableTo<FastifyRequest>()
  expect(reply).type.toBeAssignableTo<FastifyReply>()
}

server.register(async (instance) => {
  instance.addHook('preHandler', customTypedHook)
})

// Test custom Context Config types for hooks
type CustomContextConfig = FastifyContextConfig & {
  foo: string;
  bar: number;
}
type CustomContextConfigWithDefault = CustomContextConfig & FastifyRouteConfig

server.route<RouteGenericInterface, CustomContextConfig>({
  method: 'GET',
  url: '/',
  handler: () => { },
  onRequest: (request, reply, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preParsing: (request, reply, payload, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preValidation: (request, reply, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preHandler: (request, reply, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preSerialization: (request, reply, payload, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onSend: (request, reply, payload, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onResponse: (request, reply, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onTimeout: (request, reply, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onError: (request, reply, error, done) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  }
})

server.get<RouteGenericInterface, CustomContextConfig>('/', {
  onRequest: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preParsing: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preValidation: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preHandler: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preSerialization: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onSend: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onResponse: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onTimeout: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onError: async (request, reply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  }
}, async (request, reply) => {
  expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
})

type CustomContextRequest = FastifyRequest<any, any, any, any, any, CustomContextConfig, any>
type CustomContextReply = FastifyReply<any, any, any, any, CustomContextConfig, any, any>
server.route<RouteGenericInterface, CustomContextConfig>({
  method: 'GET',
  url: '/',
  handler: () => { },
  onRequest: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preParsing: async (request: CustomContextRequest, reply: CustomContextReply, payload: RequestPayload) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preValidation: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preHandler: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  preSerialization: async (request: CustomContextRequest, reply: CustomContextReply, payload: any) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onSend: async (request: CustomContextRequest, reply: CustomContextReply, payload: any) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onResponse: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onTimeout: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  },
  onError: async (request: CustomContextRequest, reply: CustomContextReply, error: FastifyError) => {
    expect(request.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
    expect(reply.routeOptions.config).type.toBe<CustomContextConfigWithDefault>()
  }
})

server.route({
  method: 'GET',
  url: '/',
  handler: (request, reply) => {
    expect(request).type.toBe<FastifyRequest>()
    expect(reply).type.toBe<FastifyReply>()
  },
  onRequest: (request, reply, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  onRequestAbort: (request, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  preParsing: (request, reply, payload, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<RequestPayload>()
    expect(done).type.toBe<
      <TError extends Error = FastifyError>(
        err?: TError | null | undefined,
        res?: RequestPayload | undefined
      ) => void
        >()
  },
  preValidation: (request, reply, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  preHandler: (request, reply, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  preSerialization: (request, reply, payload, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<unknown>()
    expect(done).type.toBe<DoneFuncWithErrOrRes>()
  },
  onSend: (request, reply, payload, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<unknown>()
    expect(done).type.toBe<DoneFuncWithErrOrRes>()
  },
  onResponse: (request, reply, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  onTimeout: (request, reply, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(done).type.toBe<HookHandlerDoneFunction>()
  },
  onError: (request, reply, error, done) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(error).type.toBe<FastifyError>()
    expect(done).type.toBe<() => void>()
  }
})

server.get('/', {
  onRequest: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  onRequestAbort: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBe<HookHandlerDoneFunction>()
  },
  preParsing: async (request, reply, payload) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<RequestPayload>()
  },
  preValidation: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  preHandler: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  preSerialization: async (request, reply, payload) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<unknown>()
  },
  onSend: async (request, reply, payload) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(payload).type.toBe<unknown>()
  },
  onResponse: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  onTimeout: async (request, reply) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
  },
  onError: async (request, reply, error) => {
    expect(request).type.toBeAssignableTo<FastifyRequest>()
    expect(reply).type.toBeAssignableTo<FastifyReply>()
    expect(error).type.toBe<FastifyError>()
  }
}, async (request, reply) => {
  expect(request).type.toBe<FastifyRequest>()
  expect(reply).type.toBe<FastifyReply>()
})

// TODO: Should throw errors
// expectError(server.get('/', { onRequest: async (request, reply, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { onRequestAbort: async (request, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { preParsing: async (request, reply, payload, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { preValidation: async (request, reply, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { preHandler: async (request, reply, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { preSerialization: async (request, reply, payload, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { onSend: async (request, reply, payload, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { onResponse: async (request, reply, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { onTimeout: async (request, reply, done) => {} }, async (request, reply) => {}))
// expectError(server.get('/', { onError: async (request, reply, error, done) => {} }, async (request, reply) => {}))

server.addHook('preClose', function (done) {
  expect(this).type.toBe<FastifyInstance>()
  expect(done).type.toBeAssignableTo<(err?: FastifyError) => void>()
  expect(done).type.toBeAssignableTo<(err?: NodeJS.ErrnoException) => void>()
  expect(done(new Error())).type.toBe<void>()
})

server.addHook('preClose', async function () {
  expect(this).type.toBe<FastifyInstance>()
})

// @ts-expect-error!
server.addHook('onClose', async function (instance, done) {})
// @ts-expect-error!
server.addHook('onError', async function (request, reply, error, done) {})
// @ts-expect-error!
server.addHook('onReady', async function (done) {})
// @ts-expect-error!
server.addHook('onListen', async function (done) {})
// @ts-expect-error!
server.addHook('onRequest', async function (request, reply, done) {})
// @ts-expect-error!
server.addHook('onRequestAbort', async function (request, done) {})
// @ts-expect-error!
server.addHook('onResponse', async function (request, reply, done) {})
// @ts-expect-error!
server.addHook('onSend', async function (request, reply, payload, done) {})
// @ts-expect-error!
server.addHook('onTimeout', async function (request, reply, done) {})
// @ts-expect-error!
server.addHook('preClose', async function (done) {})
// @ts-expect-error!
server.addHook('preHandler', async function (request, reply, done) {})
// @ts-expect-error!
server.addHook('preSerialization', async function (request, reply, payload, done) {})
// @ts-expect-error!
server.addHook('preValidation', async function (request, reply, done) {})
