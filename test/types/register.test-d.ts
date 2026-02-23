import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { Http2Server, Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import { expect } from 'tstyche'
import fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyBaseLogger,
  type FastifyPluginAsync,
  type FastifyPluginCallback,
  type FastifyPluginOptions,
  type RawServerDefault
} from '../../fastify.js'

const testPluginCallback: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOpts: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginOptsAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOptsWithType = (
  instance: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginOptsWithTypeAsync = async (instance: FastifyInstance, opts: FastifyPluginOptions) => { }

interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}

// Type validation
expect(fastify().register).type.not.toBeCallableWith(testPluginOptsAsync, { prefix: 1 })
expect(fastify().register).type.not.toBeCallableWith(testPluginOptsAsync, { logLevel: () => ({}) })
expect(fastify().register).type.not.toBeCallableWith(testPluginOptsAsync, { logSerializers: () => ({}) })
expect(fastify().register).type.not.toBeCallableWith({})

expect(
  fastify().register(
    testPluginOptsAsync, { prefix: '/example', logLevel: 'info', logSerializers: { key: (value: any) => `${value}` } }
  )
).type.toBeAssignableTo<FastifyInstance>()

expect(
  fastify().register(testPluginOptsAsync, () => {
    return {}
  })
).type.toBeAssignableTo<FastifyInstance>()

expect(
  fastify().register(testPluginOptsAsync, (instance) => {
    expect(instance).type.toBe<FastifyInstance>()
  })
).type.toBeAssignableTo<FastifyInstance>()

// With Http2
const serverWithHttp2 = fastify({ http2: true })
type ServerWithHttp2 = FastifyInstance<Http2Server, Http2ServerRequest, Http2ServerResponse>
const testPluginWithHttp2: FastifyPluginCallback<TestOptions, Http2Server> = function (instance, opts, done) { }
const testPluginWithHttp2Async: FastifyPluginAsync<TestOptions, Http2Server> = async function (instance, opts) { }
const testPluginWithHttp2WithType = (
  instance: ServerWithHttp2,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginWithHttp2WithTypeAsync = async (
  instance: ServerWithHttp2,
  opts: FastifyPluginOptions
) => { }
const testOptions: TestOptions = {
  option1: 'a',
  option2: false
}
expect(serverWithHttp2.register(testPluginCallback)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginAsync)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginOpts)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginOptsAsync)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginOptsWithType)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginOptsWithTypeAsync)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register).type.not.toBeCallableWith(testPluginWithHttp2)
expect(serverWithHttp2.register(testPluginWithHttp2, testOptions)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register).type.not.toBeCallableWith(testPluginWithHttp2Async)
expect(serverWithHttp2.register(testPluginWithHttp2Async, testOptions)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginWithHttp2WithType)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(testPluginWithHttp2WithTypeAsync)).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register((instance) => {
  expect(instance).type.toBeAssignableTo<FastifyInstance>()
})).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register((instance: ServerWithHttp2) => {
  expect(instance).type.toBeAssignableTo<ServerWithHttp2>()
})).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(async (instance) => {
  expect(instance).type.toBeAssignableTo<FastifyInstance>()
})).type.toBeAssignableTo<ServerWithHttp2>()
expect(serverWithHttp2.register(async (instance: ServerWithHttp2) => {
  expect(instance).type.toBeAssignableTo<ServerWithHttp2>()
})).type.toBeAssignableTo<ServerWithHttp2>()

// With Type Provider
type TestTypeProvider = { schema: 'test', validator: 'test', serializer: 'test' }
const serverWithTypeProvider = fastify().withTypeProvider<TestTypeProvider>()
type ServerWithTypeProvider = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  FastifyBaseLogger,
  TestTypeProvider
>
const testPluginWithTypeProvider: FastifyPluginCallback<
  TestOptions,
  RawServerDefault,
  TestTypeProvider
> = function (instance, opts, done) { }
const testPluginWithTypeProviderAsync: FastifyPluginAsync<
  TestOptions,
  RawServerDefault,
  TestTypeProvider
> = async function (instance, opts) { }
const testPluginWithTypeProviderWithType = (
  instance: ServerWithTypeProvider,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginWithTypeProviderWithTypeAsync = async (
  instance: ServerWithTypeProvider,
  opts: FastifyPluginOptions
) => { }
expect(serverWithTypeProvider.register(testPluginCallback)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(testPluginAsync)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(testPluginOpts)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(testPluginOptsAsync)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(testPluginOptsWithType)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(testPluginOptsWithTypeAsync)).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register).type.not.toBeCallableWith(testPluginWithTypeProvider)
expect(serverWithTypeProvider.register(testPluginWithTypeProvider, testOptions)).type.toBeAssignableTo<
  ServerWithTypeProvider
>()
expect(serverWithTypeProvider.register).type.not.toBeCallableWith(testPluginWithTypeProviderAsync)
expect(serverWithTypeProvider.register(testPluginWithTypeProviderAsync, testOptions)).type.toBeAssignableTo<
  ServerWithTypeProvider
>()
expect(serverWithTypeProvider.register(testPluginWithTypeProviderWithType)).type.toBeAssignableTo<
  ServerWithTypeProvider
>()
expect(serverWithTypeProvider.register(testPluginWithTypeProviderWithTypeAsync)).type.toBeAssignableTo<
  ServerWithTypeProvider
>()
expect(serverWithTypeProvider.register((instance) => {
  expect(instance).type.toBeAssignableTo<FastifyInstance>()
})).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register((instance: ServerWithTypeProvider) => {
  expect(instance).type.toBeAssignableTo<ServerWithTypeProvider>()
})).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(async (instance) => {
  expect(instance).type.toBeAssignableTo<FastifyInstance>()
})).type.toBeAssignableTo<ServerWithTypeProvider>()
expect(serverWithTypeProvider.register(async (instance: ServerWithTypeProvider) => {
  expect(instance).type.toBeAssignableTo<ServerWithTypeProvider>()
})).type.toBeAssignableTo<ServerWithTypeProvider>()

// With Type Provider and logger
const customLogger = {
  level: 'info',
  info: () => { },
  warn: () => { },
  error: () => { },
  fatal: () => { },
  trace: () => { },
  debug: () => { },
  child: () => customLogger,
  silent: () => { }
}
const serverWithTypeProviderAndLogger = fastify({
  loggerInstance: customLogger
}).withTypeProvider<TestTypeProvider>()
type ServerWithTypeProviderAndLogger = FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse,
  typeof customLogger,
  TestTypeProvider
>
const testPluginWithTypeProviderAndLogger: FastifyPluginCallback<
  TestOptions,
  RawServerDefault,
  TestTypeProvider,
  typeof customLogger
> = function (instance, opts, done) { }
const testPluginWithTypeProviderAndLoggerAsync: FastifyPluginAsync<
  TestOptions,
  RawServerDefault,
  TestTypeProvider,
  typeof customLogger
> = async function (instance, opts) { }
const testPluginWithTypeProviderAndLoggerWithType = (
  instance: ServerWithTypeProviderAndLogger,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginWithTypeProviderAndLoggerWithTypeAsync = async (
  instance: ServerWithTypeProviderAndLogger,
  opts: FastifyPluginOptions
) => { }
expect(serverWithTypeProviderAndLogger.register(testPluginCallback)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register(testPluginAsync)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register(testPluginOpts)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register(testPluginOptsAsync)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register(testPluginOptsWithType)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register(testPluginOptsWithTypeAsync)).type.toBeAssignableTo<
  ServerWithTypeProviderAndLogger
>()
expect(serverWithTypeProviderAndLogger.register).type.not.toBeCallableWith(testPluginWithTypeProviderAndLogger)
expect(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLogger, testOptions)
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(serverWithTypeProviderAndLogger.register).type.not.toBeCallableWith(testPluginWithTypeProviderAndLoggerAsync)
expect(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerAsync, testOptions)
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerWithType)
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerWithTypeAsync)
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register((instance) => {
    expect(instance).type.toBe<FastifyInstance>()
  })
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register((instance: ServerWithTypeProviderAndLogger) => {
    expect(instance).type.toBe<ServerWithTypeProviderAndLogger>()
  })
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register(async (instance) => {
    expect(instance).type.toBe<FastifyInstance>()
  })
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
expect(
  serverWithTypeProviderAndLogger.register(async (instance: ServerWithTypeProviderAndLogger) => {
    expect(instance).type.toBe<ServerWithTypeProviderAndLogger>()
  })
).type.toBeAssignableTo<ServerWithTypeProviderAndLogger>()
