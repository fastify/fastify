import type * as http from 'node:http'
import type * as https from 'node:https'
import type { FastifyError } from '@fastify/error'
import { expect } from 'tstyche'
import fastify, { type FastifyInstance, type FastifyPluginOptions, type SafePromiseLike } from '../../fastify.js'
import type { FastifyPluginCallback, FastifyPluginAsync } from '../../types/plugin.js'

// FastifyPlugin & FastifyRegister
interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}
const testOptions: TestOptions = {
  option1: 'a',
  option2: false
}
const testPluginOpts: FastifyPluginCallback<TestOptions> = function (instance, opts, done) {
  expect(opts).type.toBe<TestOptions>()
}
const testPluginOptsAsync: FastifyPluginAsync<TestOptions> = async function (instance, opts) {
  expect(opts).type.toBe<TestOptions>()
}

const testPluginOptsWithType = (
  instance: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (error?: FastifyError) => void
) => { }
const testPluginOptsWithTypeAsync = async (
  instance: FastifyInstance,
  opts: FastifyPluginOptions
) => { }

expect(fastify().register).type.not.toBeCallableWith(testPluginOpts, {}) // error because missing required options from generic declaration
expect(fastify().register).type.not.toBeCallableWith(testPluginOptsAsync, {}) // error because missing required options from generic declaration

expect(fastify().register(testPluginOpts, { option1: '', option2: true })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(testPluginOptsAsync, { option1: '', option2: true })).type.toBeAssignableTo<FastifyInstance>()

expect(fastify().register(function (instance, opts, done) { })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(function (instance, opts, done) { }, () => { })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(function (instance, opts, done) { }, { logLevel: 'info', prefix: 'foobar' })).type.toBeAssignableTo<FastifyInstance>()

expect(fastify().register(import('./dummy-plugin.mjs'))).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(import('./dummy-plugin.mjs'), { foo: 1 })).type.toBeAssignableTo<FastifyInstance>()

const testPluginCallback: FastifyPluginCallback = function (instance, opts, done) { }
expect(fastify().register(testPluginCallback, {})).type.toBeAssignableTo<FastifyInstance>()

const testPluginAsync: FastifyPluginAsync = async function (instance, opts) { }
expect(fastify().register(testPluginAsync, {})).type.toBeAssignableTo<FastifyInstance>()

expect(fastify().register(function (instance, opts): Promise<void> { return Promise.resolve() })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(async function (instance, opts) { }, () => { })).type.toBeAssignableTo<FastifyInstance>()
expect(fastify().register(async function (instance, opts) { }, { logLevel: 'info', prefix: 'foobar' })).type.toBeAssignableTo<FastifyInstance>()

// @ts-expect-error  'logLevel' does not exist in type
fastify().register(function (instance, opts, done) { }, { ...testOptions, logLevel: '' }) // must use a valid logLevel

const httpsServer = fastify({ https: {} })
expect(httpsServer).type.not.toBeAssignableTo<
  FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse> &
  Promise<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(httpsServer).type.toBeAssignableTo<
  FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse> &
  PromiseLike<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>
>()
expect(httpsServer).type.toBe<
  FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse> &
  SafePromiseLike<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>
>()

// Chainable
httpsServer
  .register(testPluginOpts, testOptions)
  .after((_error) => { })
  .ready((_error) => { })
  .close(() => { })

// Thenable
expect(httpsServer.after()).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.close()).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.ready()).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.register(testPluginOpts, testOptions)).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.register(testPluginOptsWithType)).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.register(testPluginOptsWithTypeAsync)).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.register(testPluginOptsWithType, { prefix: '/test' })).type.toBeAssignableTo<PromiseLike<undefined>>()
expect(httpsServer.register(testPluginOptsWithTypeAsync, { prefix: '/test' })).type.toBeAssignableTo<PromiseLike<undefined>>()

/* eslint-disable @typescript-eslint/no-unused-vars */
async function testAsync (): Promise<void> {
  await httpsServer
    .register(testPluginOpts, testOptions)
    .register(testPluginOpts, testOptions)
}
