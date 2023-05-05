import { FastifyError } from '@fastify/error'
import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RouteOptions,
  RegisterOptions,
  FastifyPluginOptions,
  FastifySchema,
  FastifyTypeProviderDefault,
  ContextConfigDefault, FastifyContextConfig, RawServerDefault
} from '../../fastify'
import { preHandlerAsyncHookHandler, RequestPayload } from '../../types/hooks'
import { RouteGenericInterface } from '../../types/route'
import { ResolveFastifyRequestType } from '../../types/type-provider'

const server = fastify()

// Test payload generic pass through for preSerialization and onSend

type TestPayloadType = {
  foo: string;
  bar: number;
}

// Synchronous Tests

server.addHook('onRequest', function (request, reply, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preParsing', function (request, reply, payload, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<RequestPayload>(payload)
  expectAssignable<(err?: FastifyError | null, res?: RequestPayload) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preValidation', function (request, reply, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preHandler', function (request, reply, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook<TestPayloadType>('preSerialization', function (request, reply, payload, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload) // we expect this to be unknown when not specified like in the previous test
  expectType<void>(done(new Error()))
  expectType<void>(done(null, 'foobar'))
  expectType<void>(done())
  expectError<void>(done(new Error(), 'foobar'))
})

server.addHook<TestPayloadType>('onSend', function (request, reply, payload, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload)
  expectType<void>(done(new Error()))
  expectType<void>(done(null, 'foobar'))
  expectType<void>(done())
  expectError<void>(done(new Error(), 'foobar'))
})

server.addHook('onResponse', function (request, reply, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onTimeout', function (request, reply, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onError', function (request, reply, error, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<FastifyError>(error)
  expectType<() => void>(done)
  expectType<void>(done())
})

server.addHook('onRequestAbort', function (request, done) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onRoute', function (opts) {
  expectType<FastifyInstance>(this)
  expectType<RouteOptions & { routePath: string; path: string; prefix: string }>(opts)
})

server.addHook('onRegister', (instance, opts, done) => {
  expectType<FastifyInstance>(instance)
  expectType<RegisterOptions & FastifyPluginOptions>(opts)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onReady', function (done) {
  expectType<FastifyInstance>(this)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('onClose', (instance, done) => {
  expectType<FastifyInstance>(instance)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

// Asynchronous

server.addHook('onRequest', async function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

server.addHook('preParsing', async function (request, reply, payload) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<RequestPayload>(payload)
})

server.addHook('preValidation', async function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

server.addHook('preHandler', async function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

server.addHook<TestPayloadType>('preSerialization', async function (request, reply, payload) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload) // we expect this to be unknown when not specified like in the previous test
})

server.addHook<TestPayloadType>('onSend', async function (request, reply, payload) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<TestPayloadType>(payload)
})

server.addHook('onResponse', async function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

server.addHook('onTimeout', async function (request, reply) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
})

server.addHook('onError', async function (request, reply, error) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
  expectType<FastifyReply>(reply)
  expectType<FastifyError>(error)
})

server.addHook('onRequestAbort', async function (request) {
  expectType<FastifyInstance>(this)
  expectType<FastifyRequest>(request)
})

server.addHook('onRegister', async (instance, opts) => {
  expectType<FastifyInstance>(instance)
  expectType<RegisterOptions & FastifyPluginOptions>(opts)
})

server.addHook('onReady', async function () {
  expectType<FastifyInstance>(this)
})

server.addHook('onClose', async (instance) => {
  expectType<FastifyInstance>(instance)
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
  expectType<FastifyInstance>(this)
  expectAssignable<FastifyRequest>(request)
  expectAssignable<FastifyReply>(reply)
}

server.register(async (instance) => {
  instance.addHook('preHandler', customTypedHook)
})

// Test custom Context Config types for hooks
type CustomContextConfig = FastifyContextConfig & {
  foo: string;
  bar: number;
}

server.route<RouteGenericInterface, CustomContextConfig>({
  method: 'GET',
  url: '/',
  handler: () => { },
  onRequest: (request, reply, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preParsing: (request, reply, payload, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preValidation: (request, reply, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preHandler: (request, reply, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preSerialization: (request, reply, payload, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onSend: (request, reply, payload, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onResponse: (request, reply, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onTimeout: (request, reply, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onError: (request, reply, error, done) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  }
})

server.get<RouteGenericInterface, CustomContextConfig>('/', {
  onRequest: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preParsing: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preValidation: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preHandler: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preSerialization: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onSend: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onResponse: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onTimeout: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onError: async (request, reply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  }
}, async (request, reply) => {
  expectType<CustomContextConfig>(request.context.config)
  expectType<CustomContextConfig>(reply.context.config)
})

type CustomContextRequest = FastifyRequest<any, any, any, any, any, CustomContextConfig, any>
type CustomContextReply = FastifyReply<any, any, any, any, CustomContextConfig, any, any>
server.route<RouteGenericInterface, CustomContextConfig>({
  method: 'GET',
  url: '/',
  handler: () => { },
  onRequest: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preParsing: async (request: CustomContextRequest, reply: CustomContextReply, payload: RequestPayload) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preValidation: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preHandler: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  preSerialization: async (request: CustomContextRequest, reply: CustomContextReply, payload: any) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onSend: async (request: CustomContextRequest, reply: CustomContextReply, payload: any) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onResponse: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onTimeout: async (request: CustomContextRequest, reply: CustomContextReply) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  },
  onError: async (request: CustomContextRequest, reply: CustomContextReply, error: FastifyError) => {
    expectType<CustomContextConfig>(request.context.config)
    expectType<CustomContextConfig>(reply.context.config)
  }
})

server.addHook('preClose', function (done) {
  expectType<FastifyInstance>(this)
  expectAssignable<(err?: FastifyError) => void>(done)
  expectAssignable<(err?: NodeJS.ErrnoException) => void>(done)
  expectType<void>(done(new Error()))
})

server.addHook('preClose', async function () {
  expectType<FastifyInstance>(this)
})
