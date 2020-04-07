import fastify, { FastifyPlugin, FastifyInstance, FastifyPluginOptions } from '../../fastify'
import * as http from 'http'
import * as https from 'https'
import { expectType, expectError } from 'tsd'

// FastifyPlugin & FastifyRegister
interface TestOptions extends FastifyPluginOptions {
  option1: string;
  option2: boolean;
}
const testPlugin: FastifyPlugin<TestOptions> = function (instance, opts, next) { }

expectError(fastify().register(testPlugin, {})) // error because missing required options from generic declaration
expectType<void>(fastify().register(testPlugin, { option1: '', option2: true }))

expectType<void>(fastify().register(function (instace, opts, next) { }))
expectType<void>(fastify().register(function (instace, opts, next) { }, () => { }))
expectType<void>(fastify().register(function (instance, opts, next) { }, { logLevel: 'info', prefix: 'foobar' }))
expectError(fastify().register(function (instance, opts, next) { }, { logLevel: '' })) // must use a valid logLevel

const httpsServer = fastify({ https: {} });
expectType<FastifyInstance<https.Server, http.IncomingMessage, http.ServerResponse>>(httpsServer)

httpsServer.register(testPlugin);
