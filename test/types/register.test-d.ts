import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, { FastifyInstance, FastifyError, FastifyPluginAsync, FastifyPluginCallback, FastifyPluginOptions, RawServerDefault } from '../../fastify'

const testPluginCallback: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOpts: FastifyPluginCallback = function (instance, opts, done) { }
const testPluginOptsAsync: FastifyPluginAsync = async function (instance, opts) { }

const testPluginOptsWithType = (instance: FastifyInstance, opts: FastifyPluginOptions, done: (error?: FastifyError) => void) => { }
const testPluginOptsWithTypeAsync = async (instance: FastifyInstance, opts: FastifyPluginOptions) => { }

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

// With Type Provider
interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}
type TestTypeProvider = { input: 'test', output: 'test' }
const serverWithTypeProvider = fastify().withTypeProvider<TestTypeProvider>()
const testPluginWithTypeProvider: FastifyPluginCallback<TestOptions, RawServerDefault, TestTypeProvider> = function (instance, opts, done) { }
const testPluginWithTypeProviderAsync: FastifyPluginAsync<TestOptions, RawServerDefault, TestTypeProvider> = async function (instance, opts) { }
const testPluginWithTypeProviderWithType = (instance: typeof serverWithTypeProvider, opts: FastifyPluginOptions, done: (error?: FastifyError) => void) => { }
const testPluginWithTypeProviderWithTypeAsync = async (instance: typeof serverWithTypeProvider, opts: FastifyPluginOptions) => { }
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginCallback))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginAsync))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginOpts))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsAsync))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsWithType))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginOptsWithTypeAsync))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProvider))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderAsync))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderWithType))
expectAssignable<typeof serverWithTypeProvider>(serverWithTypeProvider.register(testPluginWithTypeProviderWithTypeAsync))
