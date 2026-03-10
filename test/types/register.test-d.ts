import { expectAssignable, expectError, expectType } from 'tsd'
import { IncomingMessage, Server, ServerResponse } from 'node:http'
import { Http2Server, Http2ServerRequest, Http2ServerResponse } from 'node:http2'
import fastify, { AnyFastifyInstance, FastifyInstance, FastifyError, FastifyBaseLogger, FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions } from '../../fastify'

const testPluginCallback: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOpts: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginOptsAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOptsWithType = (
  instance: AnyFastifyInstance,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginOptsWithTypeAsync = async (instance: AnyFastifyInstance, opts: FastifyPluginOptions) => { }

interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}

// Type validation
expectError(fastify().register(testPluginOptsAsync, { prefix: 1 }))
expectError(fastify().register(testPluginOptsAsync, { logLevel: () => ({}) }))
expectError(fastify().register(testPluginOptsAsync, { logSerializers: () => ({}) }))
expectError(fastify().register({}))

expectAssignable<FastifyInstance>(
  fastify().register(
    testPluginOptsAsync, { prefix: '/example', logLevel: 'info', logSerializers: { key: (value: any) => `${value}` } }
  )
)

expectAssignable<FastifyInstance>(
  fastify().register(testPluginOptsAsync, () => {
    return {}
  })
)

expectAssignable<FastifyInstance>(
  fastify().register(testPluginOptsAsync, (instance) => {
    expectType<FastifyInstance>(instance)
  })
)

// With Http2
const serverWithHttp2 = fastify({ http2: true })
type ServerWithHttp2 = FastifyInstance<Http2Server, Http2ServerRequest, Http2ServerResponse>
const testPluginWithHttp2: FastifyPluginCallback<TestOptions, ServerWithHttp2> = function (instance, opts, done) { }
const testPluginWithHttp2Async: FastifyPluginAsync<TestOptions, ServerWithHttp2> = async function (instance, opts) { }
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
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginCallback))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginAsync))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginOpts))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginOptsAsync))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginOptsWithType))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginOptsWithTypeAsync))
// @ts-expect-error
serverWithHttp2.register(testPluginWithHttp2)
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginWithHttp2, testOptions))
// @ts-expect-error
serverWithHttp2.register(testPluginWithHttp2Async)
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginWithHttp2Async, testOptions))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginWithHttp2WithType))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(testPluginWithHttp2WithTypeAsync))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register((instance) => {
  expectAssignable<AnyFastifyInstance>(instance)
}))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register((instance: ServerWithHttp2) => {
  expectAssignable<ServerWithHttp2>(instance)
}))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(async (instance) => {
  expectAssignable<AnyFastifyInstance>(instance)
}))
expectAssignable<ServerWithHttp2>(serverWithHttp2.register(async (instance: ServerWithHttp2) => {
  expectAssignable<ServerWithHttp2>(instance)
}))

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
  ServerWithTypeProvider
> = function (instance, opts, done) { }
const testPluginWithTypeProviderAsync: FastifyPluginAsync<
  TestOptions,
  ServerWithTypeProvider
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
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginCallback))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginAsync))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginOpts))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsAsync))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsWithType))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsWithTypeAsync))
// @ts-expect-error
serverWithTypeProvider.register(testPluginWithTypeProvider)
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProvider, testOptions))
// @ts-expect-error
serverWithTypeProvider.register(testPluginWithTypeProviderAsync)
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderAsync, testOptions))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderWithType))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderWithTypeAsync))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register((instance) => {
  expectAssignable<AnyFastifyInstance>(instance)
}))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register((instance: ServerWithTypeProvider) => {
  expectAssignable<ServerWithTypeProvider>(instance)
}))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(async (instance) => {
  expectAssignable<AnyFastifyInstance>(instance)
}))
expectAssignable<ServerWithTypeProvider>(serverWithTypeProvider.register(async (instance: ServerWithTypeProvider) => {
  expectAssignable<ServerWithTypeProvider>(instance)
}))

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
  ServerWithTypeProviderAndLogger
> = function (instance, opts, done) { }
const testPluginWithTypeProviderAndLoggerAsync: FastifyPluginAsync<
  TestOptions,
  ServerWithTypeProviderAndLogger
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
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginCallback))
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginAsync))
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginOpts))
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginOptsAsync))
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginOptsWithType))
expectAssignable<ServerWithTypeProviderAndLogger>(serverWithTypeProviderAndLogger.register(testPluginOptsWithTypeAsync))
expectAssignable<ServerWithTypeProviderAndLogger>(
  // @ts-expect-error
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLogger)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLogger, testOptions)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  // @ts-expect-error
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerAsync)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerAsync, testOptions)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerWithType)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(testPluginWithTypeProviderAndLoggerWithTypeAsync)
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register((instance) => {
    expectAssignable<AnyFastifyInstance>(instance)
  })
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register((instance: ServerWithTypeProviderAndLogger) => {
    expectAssignable<ServerWithTypeProviderAndLogger>(instance)
  })
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(async (instance) => {
    expectAssignable<AnyFastifyInstance>(instance)
  })
)
expectAssignable<ServerWithTypeProviderAndLogger>(
  serverWithTypeProviderAndLogger.register(async (instance: ServerWithTypeProviderAndLogger) => {
    expectAssignable<ServerWithTypeProviderAndLogger>(instance)
  })
)
