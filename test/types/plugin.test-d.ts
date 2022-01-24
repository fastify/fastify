import { FastifyError } from 'fastify-error'
import { expectAssignable, expectError, expectType } from 'tsd'
import fastify, { FastifyInstance, FastifyPluginOptions } from '../../fastify'
import { FastifyInstanceHttpsGenericInterface } from '../../types/instance'
import { FastifyPluginAsync, FastifyPluginCallback } from '../../types/plugin'

// FastifyPlugin & FastifyRegister
interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}
const testPluginOpts: FastifyPluginCallback<TestOptions> = function (instance, opts, done) { }
const testPluginOptsAsync: FastifyPluginAsync<TestOptions> = async function (instance, opts) { }

const testPluginOptsWithType = (instance: FastifyInstance, opts: FastifyPluginOptions, done: (error?: FastifyError) => void) => { }
const testPluginOptsWithTypeAsync = async (instance: FastifyInstance, opts: FastifyPluginOptions) => { }

expectError(fastify().register(testPluginOpts, {})) // error because missing required options from generic declaration
expectError(fastify().register(testPluginOptsAsync, {})) // error because missing required options from generic declaration

expectAssignable<FastifyInstance>(fastify().register(testPluginOpts, { option1: '', option2: true }))
expectAssignable<FastifyInstance>(fastify().register(testPluginOptsAsync, { option1: '', option2: true }))

expectAssignable<FastifyInstance>(fastify().register(function (instance, opts, done) { }))
expectAssignable<FastifyInstance>(fastify().register(function (instance, opts, done) { }, () => { }))
expectAssignable<FastifyInstance>(fastify().register(function (instance, opts, done) { }, { logLevel: 'info', prefix: 'foobar' }))

expectAssignable<FastifyInstance>(fastify().register(import('./dummy-plugin')))
expectAssignable<FastifyInstance>(fastify().register(import('./dummy-plugin'), { foo: 1 }))

const testPluginCallback: FastifyPluginCallback = function (instance, opts, done) { }
expectAssignable<FastifyInstance>(fastify().register(testPluginCallback, {}))

const testPluginAsync: FastifyPluginAsync = async function (instance, opts) { }
expectAssignable<FastifyInstance>(fastify().register(testPluginAsync, {}))

expectAssignable<FastifyInstance>(fastify().register(function (instance, opts): Promise<void> { return Promise.resolve() }))
expectAssignable<FastifyInstance>(fastify().register(async function (instance, opts) { }, () => { }))
expectAssignable<FastifyInstance>(fastify().register(async function (instance, opts) { }, { logLevel: 'info', prefix: 'foobar' }))

expectError(fastify().register(function (instance, opts, done) { }, { logLevel: '' })) // must use a valid logLevel

const httpsServer = fastify({ https: {} })
expectType<FastifyInstance<FastifyInstanceHttpsGenericInterface> & PromiseLike<FastifyInstance<FastifyInstanceHttpsGenericInterface>>>(httpsServer)

// Chainable
httpsServer
  .register(testPluginOpts)
  .after((_error) => { })
  .ready((_error) => { })
  .close(() => { })

// Thenable
expectAssignable<PromiseLike<undefined>>(httpsServer.after())
expectAssignable<PromiseLike<undefined>>(httpsServer.close())
expectAssignable<PromiseLike<undefined>>(httpsServer.ready())
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPluginOpts))
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPluginOptsWithType))
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPluginOptsWithTypeAsync))
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPluginOptsWithType, { prefix: '/test' }))
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPluginOptsWithTypeAsync, { prefix: '/test' }))

async function testAsync (): Promise<void> {
  await httpsServer
    .register(testPluginOpts)
    .register(testPluginOpts)
}
