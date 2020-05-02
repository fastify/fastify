import fastify, { FastifyPlugin, FastifyInstance, FastifyPluginOptions } from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import { expectType, expectError, expectAssignable } from 'tsd'

// FastifyPlugin & FastifyRegister
interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}
const testPlugin: FastifyPlugin<TestOptions> = function (instance, opts, next) { }

expectError(fastify().register(testPlugin, {})) // error because missing required options from generic declaration
expectAssignable<FastifyInstance>(fastify().register(testPlugin, { option1: '', option2: true }))
expectAssignable<FastifyInstance>(fastify().register(function (instace, opts, next) { }))
expectAssignable<FastifyInstance>(fastify().register(function (instace, opts, next) { }, () => { }))
expectAssignable<FastifyInstance>(fastify().register(function (instance, opts, next) { }, { logLevel: 'info', prefix: 'foobar' }))
expectError(fastify().register(function (instance, opts, next) { }, { logLevel: '' })) // must use a valid logLevel

const httpsServer = fastify({ https: {} });
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(httpsServer)

// Chainable
httpsServer
  .register(testPlugin)
  .after((_error) => { })
  .close(() => { })
  .ready((_error) => { })

// Thenable
expectAssignable<PromiseLike<undefined>>(httpsServer.after());
expectAssignable<PromiseLike<undefined>>(httpsServer.close());
expectAssignable<PromiseLike<undefined>>(httpsServer.ready());
expectAssignable<PromiseLike<undefined>>(httpsServer.register(testPlugin));

async function testAsync() {
  await httpsServer
    .register(testPlugin)
    .register(testPlugin)
}
